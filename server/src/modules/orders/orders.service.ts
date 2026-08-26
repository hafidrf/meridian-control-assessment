import { v4 as uuid } from "uuid";
import { db, nowIso } from "../../db/client.js";
import { notFound, notImplemented } from "../../utils/errors.js";
import { parsePagination } from "../../utils/pagination.js";
import type { PaginationQuery } from "../../types/index.js";
import type { Order } from "./orders.types.js";

function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    reference: String(row.reference),
    customerId: String(row.customer_id),
    warehouseId: String(row.warehouse_id),
    status: row.status as Order["status"],
    priority: row.priority as Order["priority"],
    promisedAt: (row.promised_at as string) ?? null,
    notes: (row.notes as string) ?? null,
    createdBy: (row.created_by as string) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const ordersService = {
  list(query: PaginationQuery & { status?: string; q?: string; warehouseId?: string }) {
    const page = parsePagination(query);
    let sql = "SELECT * FROM orders WHERE 1=1";
    const params: string[] = [];
    if (query.status) {
      sql += " AND status = ?";
      params.push(query.status);
    }
    if (query.warehouseId) {
      sql += " AND warehouse_id = ?";
      params.push(query.warehouseId);
    }
    if (query.q) {
      sql += " AND reference LIKE ?";
      params.push(`%${query.q}%`);
    }
    const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
    return { data: rows.map(mapOrder), total: rows.length, offset: page.offset, limit: page.limit };
  },

  getById(id: string) {
    const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) notFound("Order", id);
    const lines = db.prepare("SELECT * FROM order_lines WHERE order_id = ?").all(id);
    return { ...mapOrder(row), lines };
  },

  create(_input: unknown, _actorId: string) {
    notImplemented("ordersService.create");
  },

  update(_id: string, _input: unknown) {
    notImplemented("ordersService.update");
  },

  remove(_id: string) {
    notImplemented("ordersService.remove");
  },

  transition(_id: string, _status: string, _note?: string) {
    notImplemented("ordersService.transition");
  },

  bulkStatus(_ids: string[], _status: string) {
    notImplemented("ordersService.bulkStatus");
  },

  duplicate(_id: string) {
    notImplemented("ordersService.duplicate");
  },

  allocateInventory(_id: string) {
    notImplemented("ordersService.allocateInventory");
  },

  exportCsv(_query: unknown) {
    notImplemented("ordersService.exportCsv");
  },

  nextReference() {
    return `ORD-${String(10000 + Math.floor(Math.random() * 90000))}`;
  },

  createDraftPlaceholder() {
    return { id: uuid(), reference: this.nextReference(), createdAt: nowIso() };
  },
};
