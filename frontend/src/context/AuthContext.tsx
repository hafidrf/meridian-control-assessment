import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import type { User } from "../types";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("meridian.accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("meridian.accessToken");
        localStorage.removeItem("meridian.refreshToken");
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const res = await authApi.login(email, password);
        localStorage.setItem("meridian.accessToken", res.tokens.accessToken);
        localStorage.setItem("meridian.refreshToken", res.tokens.refreshToken);
        setUser(res.user);
      },
      logout: () => {
        const refresh = localStorage.getItem("meridian.refreshToken");
        if (refresh) void authApi.logout(refresh).catch(() => undefined);
        localStorage.removeItem("meridian.accessToken");
        localStorage.removeItem("meridian.refreshToken");
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
