import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { notFound, notImplemented } from "../../utils/errors.js";
import { listResponse } from "../../utils/respond.js";
import type { PaginationQuery } from "../../types/index.js";
import type { Request, Response } from "express";

const createSchema = z.object({
  code: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingCity: z.string().optional(),
  creditLimit: z.number().optional(),
});

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get("/", (req: Request, res: Response) => {
  const q = String(req.query.q ?? "");
  const rows = q
    ? db.prepare("SELECT * FROM customers WHERE name LIKE ? OR code LIKE ?").all(`%${q}%`, `%${q}%`)
    : db.prepare("SELECT * FROM customers").all();
  listResponse(res, rows as object[], req.query as PaginationQuery);
});

customersRouter.get("/:id", (req: Request, res: Response) => {
  const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
  if (!row) notFound("Customer", req.params.id);
  res.json(row);
});

customersRouter.get("/:id/orders", (_req, res) => {
  notImplemented("customers.orderHistory");
  res.status(501).end();
});

customersRouter.post("/", requireRoles("admin", "dispatcher"), validate(createSchema), (_req, res) => {
  notImplemented("customers.create");
  res.status(501).end();
});

customersRouter.patch("/:id", requireRoles("admin", "dispatcher"), (_req, res) => {
  notImplemented("customers.update");
  res.status(501).end();
});

customersRouter.delete("/:id", requireRoles("admin"), (_req, res) => {
  notImplemented("customers.archive");
  res.status(501).end();
});
