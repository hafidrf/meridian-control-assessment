import { apiGet, apiPost } from "./client";
import type { User } from "../types";

export type LoginResponse = {
  user: User;
  tokens: { accessToken: string; refreshToken: string; expiresIn: string };
};

export const authApi = {
  login: (email: string, password: string) => apiPost<LoginResponse>("/auth/login", { email, password }),
  me: () => apiGet<User>("/auth/me"),
  logout: (refreshToken: string) => apiPost<void>("/auth/logout", { refreshToken }),
  refresh: (refreshToken: string) => apiPost<LoginResponse["tokens"]>("/auth/refresh", { refreshToken }),
};
