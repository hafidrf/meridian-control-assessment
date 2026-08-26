import { Router } from "express";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/errors.js";
import type { Request, Response } from "express";

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRoles("admin"));

auditRouter.get("/", (req: Request, res: Response) => {
  const limit = Number(req.query.limit ?? 100);
  const rows = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?").all(limit);
  res.json({ logs: rows });
});

auditRouter.get("/:id", (_req, res) => {
  notImplemented("audit.getById");
  res.status(501).end();
});

auditRouter.get("/export", (_req, res) => {
  notImplemented("audit.export");
  res.status(501).end();
});
