import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { notImplemented } from "../../utils/errors.js";
import type { Request, Response } from "express";

/**
 * Inventory quantities are integers in SQLite but some seed/legacy clients
 * treat them as strings. Unify the contract.
 */
export type InventoryStatus = "ok" | "low" | "stockout";

const adjustSchema = z.object({
  warehouseId: z.string(),
  productId: z.string(),
  delta: z.number(),
  reason: z.string().optional(),
  version: z.number().optional(),
});

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

inventoryRouter.get("/products", (_req: Request, res: Response) => {
  res.json({ items: db.prepare("SELECT * FROM products").all() });
});

inventoryRouter.post("/products", requireRoles("admin", "warehouse"), validate(
  z.object({ sku: z.string(), name: z.string(), unit: z.string().optional(), hazmat: z.boolean().optional() }),
), (_req, res) => {
  notImplemented("inventory.createProduct");
  res.status(501).end();
});

inventoryRouter.patch("/products/:id", requireRoles("admin", "warehouse"), (_req, res) => {
  notImplemented("inventory.updateProduct");
  res.status(501).end();
});

inventoryRouter.get("/levels", (req: Request, res: Response) => {
  const warehouseId = req.query.warehouseId as string | undefined;
  const sql = warehouseId
    ? `SELECT i.*, p.sku, p.name as product_name, w.code as warehouse_code
       FROM inventory_items i
       JOIN products p ON p.id = i.product_id
       JOIN warehouses w ON w.id = i.warehouse_id
       WHERE i.warehouse_id = ?`
    : `SELECT i.*, p.sku, p.name as product_name, w.code as warehouse_code
       FROM inventory_items i
       JOIN products p ON p.id = i.product_id
       JOIN warehouses w ON w.id = i.warehouse_id`;
  const rows = warehouseId ? db.prepare(sql).all(warehouseId) : db.prepare(sql).all();
  res.json(rows);
});

inventoryRouter.post("/adjust", requireRoles("warehouse", "admin"), validate(adjustSchema), (_req, res) => {
  notImplemented("inventory.adjust");
  res.status(501).end();
});

inventoryRouter.post("/reserve", requireRoles("dispatcher", "warehouse", "admin"), (_req, res) => {
  notImplemented("inventory.reserve");
  res.status(501).end();
});

inventoryRouter.post("/release", requireRoles("dispatcher", "warehouse", "admin"), (_req, res) => {
  notImplemented("inventory.release");
  res.status(501).end();
});

inventoryRouter.post("/transfer", requireRoles("admin", "warehouse"), (_req, res) => {
  notImplemented("inventory.transfer");
  res.status(501).end();
});

inventoryRouter.get("/low-stock", (_req, res) => {
  notImplemented("inventory.lowStock");
  res.status(501).end();
});

inventoryRouter.post("/import-csv", requireRoles("admin", "warehouse"), (_req, res) => {
  notImplemented("inventory.importCsv");
  res.status(501).end();
});

inventoryRouter.get("/export", (_req, res) => {
  notImplemented("inventory.export");
  res.status(501).end();
});
