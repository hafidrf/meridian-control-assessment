import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { AppError, type JwtPayload } from "../types/index.js";
import { unauthorized } from "../utils/errors.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    unauthorized("Missing bearer token");
  }
  const token = header.slice("Bearer ".length);
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
  } catch {
    unauthorized("Invalid or expired token");
  }

  // A valid signature is not enough: the account must still be active. This is
  // what stops a deactivated user from keeping access with an unexpired token.
  const row = db.prepare("SELECT is_active FROM users WHERE id = ?").get(payload.sub) as
    | { is_active: number }
    | undefined;
  if (!row) unauthorized("Account no longer exists");
  if (!row.is_active) throw new AppError(401, "ACCOUNT_INACTIVE", "Account is deactivated");

  req.user = payload;
  next();
}

/** Real role check: 403 when the authenticated user's role is not allowed. */
export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) unauthorized();
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", `Role '${req.user.role}' may not perform this action`);
    }
    next();
  };
}

export { AppError };
