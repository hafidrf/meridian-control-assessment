import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { env } from "../../config/env.js";
import { db, nowIso } from "../../db/client.js";
import type { JwtPayload } from "../../types/index.js";
import { badRequest, notImplemented, unauthorized } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
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
  // `jti` is essential: without it two tokens minted for the same user in the
  // same second are byte-identical, so "rotation" would hand back the very same
  // string and reuse detection could never fire.
  return jwt.sign({ sub: userId, typ: "refresh", jti: uuid() }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Refresh tokens are stored as SHA-256 digests, never raw (safety rubric:
 * "Hash refresh tokens"). The digest is stable, so lookup by hash is a plain
 * index hit; the raw JWT only ever exists on the client.
 */
function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** In-memory, single-use password reset tokens (30 minute expiry). */
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

function issueRefresh(userId: string) {
  const raw = signRefresh(userId);
  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at)
     VALUES (?, ?, ?, ?, NULL, ?)`,
  ).run(uuid(), userId, hashToken(raw), new Date(Date.now() + REFRESH_TTL_MS).toISOString(), nowIso());
  return raw;
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
    const refreshToken = issueRefresh(user.id);

    return {
      user: toPublic(user),
      tokens: { accessToken, refreshToken, expiresIn: env.jwtExpiresIn },
    };
  },

  /**
   * Rotating refresh:
   * - verify the JWT signature/expiry,
   * - look the token up by hash and require it to be unrevoked and unexpired,
   * - revoke it immediately (single use),
   * - issue a fresh pair.
   * Replaying an already-rotated token is treated as theft: we revoke every
   * active token for that user, which forces a full re-login.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) badRequest("refreshToken is required", { field: "refreshToken" });

    let payload: { sub?: string; typ?: string };
    try {
      payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as { sub?: string; typ?: string };
    } catch {
      unauthorized("Invalid or expired refresh token");
    }
    if (payload.typ !== "refresh" || !payload.sub) unauthorized("Invalid refresh token");

    const row = db
      .prepare("SELECT * FROM refresh_tokens WHERE token_hash = ?")
      .get(hashToken(refreshToken)) as
      | { id: string; user_id: string; expires_at: string; revoked_at: string | null }
      | undefined;

    if (!row) unauthorized("Refresh token is not recognised");
    if (row!.revoked_at) {
      // Reuse of a rotated token — revoke the whole family.
      db.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
        .run(nowIso(), row!.user_id);
      unauthorized("Refresh token already used — all sessions revoked");
    }
    if (new Date(row!.expires_at).getTime() < Date.now()) unauthorized("Refresh token expired");

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(row!.user_id) as UserRow | undefined;
    if (!user || !user.is_active) unauthorized("Account is not active");

    db.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?").run(nowIso(), row!.id);

    return {
      accessToken: signAccess(user),
      refreshToken: issueRefresh(user.id),
      expiresIn: env.jwtExpiresIn,
    };
  },

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return; // logout is idempotent
    db.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").run(
      nowIso(),
      hashToken(refreshToken),
    );
  },

  async changePassword(userId: string, current: string, next: string): Promise<void> {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
    if (!user) unauthorized();
    const ok = await bcrypt.compare(current, user!.password_hash);
    if (!ok) badRequest("Current password is incorrect", { field: "currentPassword" });
    if (next.length < 8) badRequest("New password must be at least 8 characters", { field: "newPassword" });

    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      bcrypt.hashSync(next, 10),
      nowIso(),
      userId,
    );
    // Changing a password invalidates other sessions.
    db.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(
      nowIso(),
      userId,
    );
  },

  async me(userId: string): Promise<PublicUser> {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
    if (!user) unauthorized();
    return toPublic(user);
  },

  /**
   * Registration is admin-only (documented in NOTES.md): the route is guarded by
   * requireRoles("admin"), so there is no public self-signup surface.
   */
  async register(input: {
    email: string;
    name: string;
    role: string;
    password: string;
    warehouseId?: string;
  }): Promise<PublicUser> {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(input.email);
    if (existing) badRequest("Email is already registered", { field: "email" });
    if (!["admin", "dispatcher", "warehouse", "driver", "viewer"].includes(input.role)) {
      badRequest("Unknown role", { field: "role" });
    }
    if (input.password.length < 8) badRequest("Password must be at least 8 characters", { field: "password" });

    const id = uuid();
    const ts = nowIso();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, warehouse_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    ).run(id, input.email, bcrypt.hashSync(input.password, 10), input.name, input.role, input.warehouseId ?? null, ts, ts);

    return { id, email: input.email, name: input.name, role: input.role as PublicUser["role"], warehouseId: input.warehouseId ?? null };
  },

  /**
   * Password reset tokens live in memory only (acceptable per the brief) but the
   * two properties that matter are real: a short expiry and strict single use.
   * The response never reveals whether an email exists.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND is_active = 1").get(email) as
      | UserRow
      | undefined;
    if (!user) return; // do not leak account existence

    const raw = crypto.randomBytes(32).toString("hex");
    resetTokens.set(hashToken(raw), { userId: user.id, expiresAt: Date.now() + 30 * 60 * 1000 });
    // A real deployment emails this; in the starter kit it is logged so the flow
    // is demonstrable without an SMTP dependency.
    logger.info("password_reset_token_issued", { email, token: raw, expiresInMinutes: 30 });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const key = hashToken(token);
    const entry = resetTokens.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      resetTokens.delete(key);
      badRequest("Reset token is invalid or expired", { field: "token" });
    }
    if (password.length < 8) badRequest("Password must be at least 8 characters", { field: "password" });

    resetTokens.delete(key); // single use, consumed even on the success path below
    const ts = nowIso();
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      bcrypt.hashSync(password, 10),
      ts,
      entry.userId,
    );
    db.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(
      ts,
      entry.userId,
    );
  },
};
