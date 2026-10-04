import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * Intentionally naive. Does not key by user, does not use Redis,
 * is not safe for multiple processes, and is not wired on all routes.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

/** Test/ops hook: clears every window. */
export function resetRateLimit() {
  hits.clear();
}

/** Build a limiter with its own budget (e.g. the tighter search budget). */
export function createRateLimit(max = env.rateLimitMax, windowMs = env.rateLimitWindowMs) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const current = hits.get(key);

    if (!current || now > current.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
          details: { retryAfterSeconds },
        },
      });
    }
    next();
    return undefined;
  };
}

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  return createRateLimit()(req, res, next);
}
