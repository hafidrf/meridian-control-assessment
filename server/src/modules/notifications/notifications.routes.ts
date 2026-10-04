import { Router } from "express";
import { db, nowIso } from "../../db/client.js";
import { requireAuth } from "../../middleware/auth.js";
import { notFound, notImplemented } from "../../utils/errors.js";
import { listResponse } from "../../utils/respond.js";
import type { PaginationQuery } from "../../types/index.js";
import type { Request, Response } from "express";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", (req: Request, res: Response) => {
  const rows = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC")
    .all(req.user!.sub);
  listResponse(res, rows as object[], req.query as PaginationQuery);
});

// Drives the shell notification bell (unread badge).
notificationsRouter.get("/unread-count", (req: Request, res: Response) => {
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM notifications WHERE (user_id = ? OR user_id IS NULL) AND read_at IS NULL")
    .get(req.user!.sub) as { n: number };
  res.json({ unread: n });
});

notificationsRouter.post("/read-all", (req: Request, res: Response) => {
  const info = db
    .prepare("UPDATE notifications SET read_at = ? WHERE read_at IS NULL AND (user_id = ? OR user_id IS NULL)")
    .run(nowIso(), req.user!.sub);
  res.json({ updated: Number(info.changes ?? 0) });
});

notificationsRouter.post("/:id/read", (req: Request, res: Response) => {
  const info = db
    .prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND (user_id = ? OR user_id IS NULL)")
    .run(nowIso(), req.params.id, req.user!.sub);
  if (Number(info.changes ?? 0) === 0) notFound("Notification", req.params.id);
  res.json({ ok: true });
});

notificationsRouter.delete("/:id", (_req, res) => {
  notImplemented("notifications.dismiss");
  res.status(501).end();
});

notificationsRouter.post("/preferences", (_req, res) => {
  notImplemented("notifications.updatePreferences");
  res.status(501).end();
});
