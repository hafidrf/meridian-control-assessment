import { Router } from "express";
import { db } from "../../db/client.js";
import { requireAuth } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/errors.js";
import type { Request, Response } from "express";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", (req: Request, res: Response) => {
  const rows = db
    .prepare("SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC")
    .all(req.user!.sub);
  res.json(rows);
});

notificationsRouter.post("/:id/read", (_req, res) => {
  notImplemented("notifications.markRead");
  res.status(501).end();
});

notificationsRouter.post("/read-all", (_req, res) => {
  notImplemented("notifications.markAllRead");
  res.status(501).end();
});

notificationsRouter.delete("/:id", (_req, res) => {
  notImplemented("notifications.dismiss");
  res.status(501).end();
});

notificationsRouter.post("/preferences", (_req, res) => {
  notImplemented("notifications.updatePreferences");
  res.status(501).end();
});
