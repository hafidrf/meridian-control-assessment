import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { env } from "../../config/env.js";
import { db, nowIso } from "../../db/client.js";
import type { JwtPayload } from "../../types/index.js";
import { notImplemented, unauthorized } from "../../utils/errors.js";
import type { AuthTokens, PublicUser } from "./auth.types.js";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: JwtPayload["role"];
  warehouse_id: string | null;
  is_active: number;
};

function signAccess(user: UserRow) {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    warehouseId: user.warehouse_id,
  };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

function signRefresh(userId: string) {
  return jwt.sign({ sub: userId, typ: "refresh" }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  } as jwt.SignOptions);
}

function toPublic(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    warehouseId: user.warehouse_id,
  };
}

export const authService = {
  async login(email: string, password: string): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
    if (!user || !user.is_active) unauthorized("Invalid credentials");
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) unauthorized("Invalid credentials");

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user.id);
    db.prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)`,
    ).run(uuid(), user.id, refreshToken, new Date(Date.now() + 7 * 864e5).toISOString(), nowIso());

    return {
      user: toPublic(user),
      tokens: { accessToken, refreshToken, expiresIn: env.jwtExpiresIn },
    };
  },

  async refresh(_refreshToken: string): Promise<AuthTokens> {
    notImplemented("authService.refresh");
  },

  async logout(_refreshToken: string): Promise<void> {
    notImplemented("authService.logout");
  },

  async me(userId: string): Promise<PublicUser> {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
    if (!user) unauthorized();
    return toPublic(user);
  },

  async register(_input: unknown): Promise<PublicUser> {
    notImplemented("authService.register");
  },

  async forgotPassword(_email: string): Promise<void> {
    notImplemented("authService.forgotPassword");
  },

  async resetPassword(_token: string, _password: string): Promise<void> {
    notImplemented("authService.resetPassword");
  },

  async changePassword(_userId: string, _current: string, _next: string): Promise<void> {
    notImplemented("authService.changePassword");
  },
};
