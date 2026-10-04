import { Router } from "express";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { notImplemented } from "../../utils/errors.js";
import { listResponse } from "../../utils/respond.js";
import type { PaginationQuery } from "../../types/index.js";
import type { Request, Response } from "express";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get("/kpis", (_req: Request, res: Response) => {
  const orders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE status NOT IN ('delivered','cancelled')").get() as { c: number }).c;
  const shipments = (db.prepare("SELECT COUNT(*) as c FROM shipments WHERE status NOT IN ('delivered','returned')").get() as { c: number }).c;
  const low = (
    db.prepare("SELECT COUNT(*) as c FROM inventory_items WHERE on_hand <= reorder_point").get() as { c: number }
  ).c;
  // Contract: generatedAt is an ISO-8601 UTC string (it used to be a unix number).
  res.json({
    openOrders: orders,
    activeShipments: shipments,
    lowStockSkus: low,
    onTimePct: 0.92,
    generatedAt: new Date().toISOString(),
  });
});

reportsRouter.get("/orders-by-status", (req: Request, res: Response) => {
  const rows = db.prepare("SELECT status, COUNT(*) as count FROM orders GROUP BY status").all();
  listResponse(res, rows as object[], req.query as PaginationQuery);
});

reportsRouter.get("/throughput", (_req, res) => {
  notImplemented("reports.throughput");
  res.status(501).end();
});

reportsRouter.get("/sla", (_req, res) => {
  notImplemented("reports.sla");
  res.status(501).end();
});

reportsRouter.get("/inventory-value", (_req, res) => {
  notImplemented("reports.inventoryValue");
  res.status(501).end();
});

reportsRouter.get("/driver-utilization", requireRoles("admin", "dispatcher"), (_req, res) => {
  notImplemented("reports.driverUtilization");
  res.status(501).end();
});

reportsRouter.post("/export", requireRoles("admin"), (_req, res) => {
  notImplemented("reports.asyncExport");
  res.status(501).end();
});
