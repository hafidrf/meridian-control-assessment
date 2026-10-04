import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { notFound, notImplemented } from "../../utils/errors.js";
import { listResponse } from "../../utils/respond.js";
import type { PaginationQuery } from "../../types/index.js";
import type { Request, Response } from "express";

const vehicleSchema = z.object({
  plate: z.string(),
  type: z.enum(["van", "box_truck", "tractor", "reefer"]),
  capacityKg: z.number().int().positive(),
  warehouseId: z.string().optional(),
});

const driverSchema = z.object({
  name: z.string(),
  licenseNo: z.string(),
  phone: z.string().optional(),
  userId: z.string().optional(),
});

export const fleetRouter = Router();
fleetRouter.use(requireAuth);

fleetRouter.get("/vehicles", (req: Request, res: Response) => {
  listResponse(res, db.prepare("SELECT * FROM vehicles").all() as object[], req.query as PaginationQuery);
});

fleetRouter.get("/vehicles/:id", (req: Request, res: Response) => {
  const row = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!row) notFound("Vehicle", req.params.id);
  res.json(row);
});

fleetRouter.post("/vehicles", requireRoles("admin", "dispatcher"), validate(vehicleSchema), (_req, res) => {
  notImplemented("fleet.createVehicle");
  res.status(501).end();
});

fleetRouter.patch("/vehicles/:id", requireRoles("admin", "dispatcher"), (_req, res) => {
  notImplemented("fleet.updateVehicle");
  res.status(501).end();
});

fleetRouter.post("/vehicles/:id/status", requireRoles("dispatcher", "admin"), (_req, res) => {
  notImplemented("fleet.setVehicleStatus");
  res.status(501).end();
});

fleetRouter.get("/drivers", (req: Request, res: Response) => {
  listResponse(res, db.prepare("SELECT * FROM drivers").all() as object[], req.query as PaginationQuery);
});

fleetRouter.get("/drivers/:id", (req: Request, res: Response) => {
  const row = db.prepare("SELECT * FROM drivers WHERE id = ?").get(req.params.id);
  if (!row) notFound("Driver", req.params.id);
  res.json(row);
});

fleetRouter.post("/drivers", requireRoles("admin", "dispatcher"), validate(driverSchema), (_req, res) => {
  notImplemented("fleet.createDriver");
  res.status(501).end();
});

fleetRouter.patch("/drivers/:id", requireRoles("admin", "dispatcher"), (_req, res) => {
  notImplemented("fleet.updateDriver");
  res.status(501).end();
});

fleetRouter.post("/drivers/:id/assign-vehicle", requireRoles("dispatcher", "admin"), (_req, res) => {
  notImplemented("fleet.assignVehicle");
  res.status(501).end();
});

fleetRouter.get("/availability", (_req, res) => {
  notImplemented("fleet.availability");
  res.status(501).end();
});
