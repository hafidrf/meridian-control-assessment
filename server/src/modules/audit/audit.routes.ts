import { Router } from "express";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/errors.js";
import { pagedResponse, parsePagination } from "../../utils/respond.js";
import type { PaginationQuery } from "../../types/index.js";
import type { Request, Response } from "express";

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRoles("admin"));

auditRouter.get("/", (req: Request, res: Response) => {
  const { page, pageSize, offset, limit } = parsePagination(req.query as PaginationQuery);
  const rows = db
    .prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit ?? pageSize, offset);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM audit_logs").get() as { n: number };
  pagedResponse(res, rows as object[], { ...(req.query as PaginationQuery), page, pageSize }, n);
});

// "export" must be registered before "/:id" (route order bug in the starter).
auditRouter.get("/export", (_req, res) => {
  notImplemented("audit.export");
  res.status(501).end();
});

auditRouter.get("/:id", (_req, res) => {
  notImplemented("audit.getById");
  res.status(501).end();
});
