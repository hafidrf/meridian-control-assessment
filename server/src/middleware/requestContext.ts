import type { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { db, nowIso } from "../db/client.js";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers["x-request-id"] as string) || uuid();
  res.setHeader("x-request-id", id);
  (req as Request & { requestId?: string }).requestId = id;
  next();
}

/** Writes a row after the response finishes. Currently unsampled and synchronous. */
export function auditAfterResponse(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (req.method === "GET" || req.path.startsWith("/api/health")) return;
    try {
      db.prepare(
        `INSERT INTO audit_logs (id, actor_id, action, resource, resource_id, ip, meta, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        uuid(),
        req.user?.sub ?? null,
        `${req.method} ${req.path}`,
        req.baseUrl || "http",
        req.params.id ?? null,
        req.ip ?? null,
        JSON.stringify({ status: res.statusCode }),
        nowIso(),
      );
    } catch {
      // swallow — starter must not crash on audit failure
    }
  });
  next();
}
