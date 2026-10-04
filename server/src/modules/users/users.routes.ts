import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { notImplemented, notFound } from "../../utils/errors.js";
import { listResponse } from "../../utils/respond.js";
import type { PaginationQuery } from "../../types/index.js";
import type { Request, Response } from "express";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.string(),
  password: z.string().min(8),
  warehouseId: z.string().optional(),
});

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/", async (req: Request, res: Response) => {
  const rows = db.prepare("SELECT id, email, name, role, warehouse_id as warehouseId, is_active as isActive, created_at as createdAt FROM users").all();
  listResponse(res, rows as object[], req.query as PaginationQuery);
});

usersRouter.get("/:id", async (req: Request, res: Response) => {
  const row = db.prepare("SELECT id, email, name, role, warehouse_id as warehouseId, is_active as isActive FROM users WHERE id = ?").get(req.params.id);
  if (!row) notFound("User", req.params.id);
  res.json(row);
});

usersRouter.post("/", requireRoles("admin"), validate(createUserSchema), async (_req, res) => {
  notImplemented("users.create");
  res.status(501).end();
});

usersRouter.patch("/:id", requireRoles("admin"), async (_req, res) => {
  notImplemented("users.update");
  res.status(501).end();
});

usersRouter.delete("/:id", requireRoles("admin"), async (_req, res) => {
  notImplemented("users.deactivate");
  res.status(501).end();
});

usersRouter.post("/:id/roles", requireRoles("admin"), async (_req, res) => {
  notImplemented("users.assignRole");
  res.status(501).end();
});

usersRouter.post("/bulk-invite", requireRoles("admin"), async (_req, res) => {
  notImplemented("users.bulkInvite");
  res.status(501).end();
});
