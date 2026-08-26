import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { notFound, notImplemented } from "../../utils/errors.js";
import type { Request, Response } from "express";

const createSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  city: z.string(),
  country: z.string(),
  timezone: z.string(),
  capacityUnits: z.number().int().positive(),
});

export const warehousesRouter = Router();
warehousesRouter.use(requireAuth);

warehousesRouter.get("/", (_req: Request, res: Response) => {
  const rows = db.prepare("SELECT * FROM warehouses").all();
  res.json(rows);
});

warehousesRouter.get("/:id", (req: Request, res: Response) => {
  const row = db.prepare("SELECT * FROM warehouses WHERE id = ?").get(req.params.id);
  if (!row) notFound("Warehouse", req.params.id);
  res.json(row);
});

warehousesRouter.get("/:id/capacity", (_req, res) => {
  notImplemented("warehouses.capacity");
  res.status(501).end();
});

warehousesRouter.post("/", requireRoles("admin"), validate(createSchema), (_req, res) => {
  notImplemented("warehouses.create");
  res.status(501).end();
});

warehousesRouter.patch("/:id", requireRoles("admin"), (_req, res) => {
  notImplemented("warehouses.update");
  res.status(501).end();
});

warehousesRouter.delete("/:id", requireRoles("admin"), (_req, res) => {
  notImplemented("warehouses.archive");
  res.status(501).end();
});
