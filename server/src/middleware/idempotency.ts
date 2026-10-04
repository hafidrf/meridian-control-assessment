import type { NextFunction, Request, Response } from "express";
import { db, nowIso } from "../db/client.js";

/**
 * Idempotent POST support via the `Idempotency-Key` header (C2).
 *
 * - No header  -> pass through untouched (the header is optional, not required).
 * - First call -> remember the key, let the handler run, store its response.
 * - Replay     -> return the stored status + body, so a retried POST cannot
 *                 create a second order.
 *
 * Keys are scoped per route + user so two different users cannot collide, and
 * the same user cannot reuse a key across endpoints accidentally.
 */
export function idempotent(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawKey = req.headers["idempotency-key"];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    if (!key || typeof key !== "string" || key.length > 200) {
      next();
      return;
    }

    const userId = req.user?.sub ?? "anonymous";
    const scopedKey = `${userId}:${key}`;

    const existing = db
      .prepare("SELECT status, response FROM idempotency_keys WHERE key = ? AND scope = ?")
      .get(scopedKey, scope) as { status: number; response: string } | undefined;

    if (existing) {
      res.setHeader("Idempotent-Replay", "true");
      res.status(existing.status).type("application/json").send(existing.response);
      return;
    }

    // Capture the body once the handler decides what to send.
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      try {
        const status = res.statusCode;
        if (status >= 200 && status < 300) {
          db.prepare(
            `INSERT OR IGNORE INTO idempotency_keys (key, scope, user_id, status, response, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(scopedKey, scope, userId, status, JSON.stringify(body), nowIso());
        }
      } catch {
        // Never fail the real request because bookkeeping failed.
      }
      return originalJson(body);
    };

    next();
  };
}
