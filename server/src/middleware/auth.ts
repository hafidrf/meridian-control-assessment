import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { JwtPayload } from "../types/index.js";
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
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    unauthorized("Invalid or expired token");
  }
}

/** Starter: role check is a no-op besides requiring a user. Candidates must implement RBAC. */
export function requireRoles(..._roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) unauthorized();
    next();
  };
}
