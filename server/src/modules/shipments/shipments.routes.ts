import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { notFound, notImplemented } from "../../utils/errors.js";
import type { Request, Response } from "express";

export type ShipmentStatus =
  | "created"
  | "dispatched"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "returned";

const createSchema = z.object({
  orderId: z.string(),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  destCity: z.string(),
  destCountry: z.string(),
  eta: z.string().optional(),
});

const eventSchema = z.object({
  status: z.string(),
  note: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const shipmentsRouter = Router();
shipmentsRouter.use(requireAuth);

shipmentsRouter.get("/", (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const rows = status
    ? db.prepare("SELECT * FROM shipments WHERE status = ?").all(status)
    : db.prepare("SELECT * FROM shipments").all();
  res.json({ shipments: rows });
});

shipmentsRouter.get("/:id", (req: Request, res: Response) => {
  const row = db.prepare("SELECT * FROM shipments WHERE id = ?").get(req.params.id);
  if (!row) notFound("Shipment", req.params.id);
  const events = db.prepare("SELECT * FROM shipment_events WHERE shipment_id = ? ORDER BY created_at").all(req.params.id);
  res.json({ ...row, events });
});

shipmentsRouter.get("/track/:trackingNo", (req: Request, res: Response) => {
  const row = db.prepare("SELECT * FROM shipments WHERE tracking_no = ?").get(req.params.trackingNo);
  if (!row) notFound("Shipment");
  res.json(row);
});

shipmentsRouter.post("/", requireRoles("dispatcher", "admin"), validate(createSchema), (_req, res) => {
  notImplemented("shipments.create");
  res.status(501).end();
});

shipmentsRouter.patch("/:id", requireRoles("dispatcher", "admin"), (_req, res) => {
  notImplemented("shipments.update");
  res.status(501).end();
});

shipmentsRouter.post("/:id/assign", requireRoles("dispatcher", "admin"), (_req, res) => {
  notImplemented("shipments.assignDriver");
  res.status(501).end();
});

shipmentsRouter.post("/:id/events", validate(eventSchema), (_req, res) => {
  notImplemented("shipments.addEvent");
  res.status(501).end();
});

shipmentsRouter.post("/:id/pod", requireRoles("driver", "dispatcher", "admin"), (_req, res) => {
  notImplemented("shipments.proofOfDelivery");
  res.status(501).end();
});

shipmentsRouter.get("/:id/eta", (_req, res) => {
  notImplemented("shipments.recalculateEta");
  res.status(501).end();
});
