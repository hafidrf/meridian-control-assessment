import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * Intentionally naive. Does not key by user, does not use Redis,
 * is not safe for multiple processes, and is not wired on all routes.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const current = hits.get(key);

  if (!current || now > current.resetAt) {
    hits.set(key, { count: 1, resetAt: now + env.rateLimitWindowMs });
    return next();
  }

  current.count += 1;
  if (current.count > env.rateLimitMax) {
    res.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
    return res.status(429).json({ message: "Too many requests" });
  }
  next();
}
