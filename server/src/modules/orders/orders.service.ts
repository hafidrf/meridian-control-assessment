import { v4 as uuid } from "uuid";
import { db, nowIso } from "../../db/client.js";
import { AppError, type PaginationQuery } from "../../types/index.js";
import { badRequest, conflict, notFound, notImplemented } from "../../utils/errors.js";
import { parsePagination } from "../../utils/pagination.js";
import type { Order } from "./orders.types.js";

/** Release the reservations an order holds (used when it is cancelled). */
function releaseLines(orderId: string, warehouseId: string) {
  const lines = db.prepare("SELECT product_id, qty FROM order_lines WHERE order_id = ?").all(orderId) as {
    product_id: string;
    qty: number;
  }[];
  for (const line of lines) {
    db.prepare(
      `UPDATE inventory_items
       SET reserved = MAX(0, reserved - ?), version = version + 1, updated_at = ?
       WHERE warehouse_id = ? AND product_id = ?`,
    ).run(line.qty, nowIso(), warehouseId, line.product_id);
  }
}

// Allowed status graph (rule: pending→picking→packed→shipped→delivered, cancel pre-ship).
const ALLOWED_TRANSITIONS: Record<Order["status"], Order["status"][]> = {
  pending: ["picking", "cancelled"],
  picking: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

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
    allocatedAt: (row.allocated_at as string) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// Unified list envelope shared by FE and BE (documented in NOTES.md).
// Sort columns are allowlisted so query params never reach SQL unsanitized.
const SORT_COLUMNS: Record<string, string> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  reference: "reference",
  status: "status",
  priority: "priority",
  promisedAt: "promised_at",
};

export const ordersService = {
  list(query: PaginationQuery & { status?: string; q?: string; warehouseId?: string }, user?: { role: string; warehouseId?: string | null }) {
    const { page, pageSize, offset, limit } = parsePagination(query);
    const where: string[] = ["1=1"];
    const params: (string | number)[] = [];
    if (query.status) {
      where.push("status = ?");
      params.push(query.status);
    }
    // Resource-level rule: warehouse users only see their own warehouse.
    if (user?.role === "warehouse" && user.warehouseId) {
      where.push("warehouse_id = ?");
      params.push(user.warehouseId);
    } else if (query.warehouseId) {
      where.push("warehouse_id = ?");
      params.push(query.warehouseId);
    }
    if (query.q) {
      where.push("reference LIKE ?");
      params.push(`%${query.q}%`);
    }
    const whereSql = where.join(" AND ");
    const sortCol = SORT_COLUMNS[query.sort ?? "createdAt"] ?? SORT_COLUMNS.createdAt;
    const order: "asc" | "desc" = query.order === "asc" ? "asc" : "desc";
    const rows = db
      .prepare(`SELECT * FROM orders WHERE ${whereSql} ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Record<string, unknown>[];
    const totalRow = db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE ${whereSql}`).get(...params) as { n: number };
    return {
      data: rows.map(mapOrder),
      page,
      pageSize,
      total: totalRow.n,
      sort: query.sort ?? "createdAt",
      order,
    };
  },

  getById(id: string) {
    const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) notFound("Order", id);
    const lines = db.prepare("SELECT * FROM order_lines WHERE order_id = ?").all(id);
    return { ...mapOrder(row), lines };
  },

  create(
    input: {
      customerId: string;
      warehouseId: string;
      priority?: string;
      promisedAt?: string;
      notes?: string;
      lines: { productId: string; qty: number; unitPrice?: number }[];
    },
    actorId: string,
  ) {
    const now = nowIso();
    return db.transaction(() => {
      if (!db.prepare("SELECT 1 FROM customers WHERE id = ?").get(input.customerId)) {
        badRequest("Unknown customer", { field: "customerId" });
      }
      if (!db.prepare("SELECT 1 FROM warehouses WHERE id = ?").get(input.warehouseId)) {
        badRequest("Unknown warehouse", { field: "warehouseId" });
      }
      for (const line of input.lines) {
        if (!db.prepare("SELECT 1 FROM products WHERE id = ?").get(line.productId)) {
          badRequest("Unknown product", { field: "lines", productId: line.productId });
        }
      }
      const id = uuid();
      db.prepare(
        `INSERT INTO orders (id, reference, customer_id, warehouse_id, status, priority, promised_at, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        this.nextReference(),
        input.customerId,
        input.warehouseId,
        input.priority ?? "normal",
        input.promisedAt ?? null,
        input.notes ?? null,
        actorId,
        now,
        now,
      );
      for (const line of input.lines) {
        db.prepare(
          "INSERT INTO order_lines (id, order_id, product_id, qty, qty_picked, unit_price) VALUES (?, ?, ?, ?, 0, ?)",
        ).run(uuid(), id, line.productId, line.qty, line.unitPrice ?? 0);
      }
      this.writeAudit(actorId, "order.create", "order", id);
      return this.getById(id);
    });
  },

  update(id: string, input: { notes?: string; priority?: string; promisedAt?: string }) {
    const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) notFound("Order", id);
    if (["shipped", "delivered", "cancelled"].includes(String(existing!.status))) {
      conflict(`Order in status '${existing!.status}' is no longer editable`);
    }
    db.prepare(
      "UPDATE orders SET notes = COALESCE(?, notes), priority = COALESCE(?, priority), promised_at = COALESCE(?, promised_at), updated_at = ? WHERE id = ?",
    ).run(input.notes ?? null, input.priority ?? null, input.promisedAt ?? null, nowIso(), id);
    return this.getById(id);
  },

  remove(id: string) {
    const existing = db.prepare("SELECT status FROM orders WHERE id = ?").get(id) as { status: string } | undefined;
    if (!existing) notFound("Order", id);
    if (["picking", "packed", "shipped"].includes(existing.status)) {
      conflict("Order has fulfilment in progress — cancel it instead of deleting");
    }
    db.transaction(() => {
      db.prepare("DELETE FROM order_lines WHERE order_id = ?").run(id);
      db.prepare("DELETE FROM orders WHERE id = ?").run(id);
    });
  },

  transition(id: string, status: Order["status"], note?: string, actorId?: string) {
    const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) notFound("Order", id);
    const from = String(existing!.status) as Order["status"];
    if (!ALLOWED_TRANSITIONS[from]?.includes(status)) {
      badRequest(`Cannot transition ${from} → ${status}`, { from, to: status });
    }
    if (status === "picking") {
      // Fulfilment may only start once stock is actually reserved for this
      // order. `allocated_at` is the single source of truth here — checking
      // "some stock is reserved somewhere" would let an unallocated order slip
      // through just because another order had reservations in the warehouse.
      if (!existing!.allocated_at) {
        conflict("Order has not been allocated — call POST /orders/:id/allocate first");
      }
      const lines = db.prepare("SELECT product_id, qty FROM order_lines WHERE order_id = ?").all(id) as {
        product_id: string;
        qty: number;
      }[];
      const warehouseId = String(existing!.warehouse_id);
      for (const line of lines) {
        const inv = db
          .prepare("SELECT reserved FROM inventory_items WHERE warehouse_id = ? AND product_id = ?")
          .get(warehouseId, line.product_id) as { reserved: number } | undefined;
        if (!inv || inv.reserved < line.qty) {
          conflict("Reserved stock is no longer sufficient for this order");
        }
      }
    }
    if (status === "cancelled") {
      // Releasing on cancel keeps `reserved` from leaking when an order dies.
      releaseLines(id, String(existing!.warehouse_id));
    }
    db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), id);
    if (note) this.writeAudit(actorId ?? null, "order.transition", "order", id, note);
    return this.getById(id);
  },

  writeAudit(actorId: string | null, action: string, resource: string, resourceId: string, note?: string) {
    db.prepare(
      "INSERT INTO audit_logs (id, actor_id, action, resource, resource_id, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(uuid(), actorId, action, resource, resourceId, note ?? null, nowIso());
  },

  bulkStatus(ids: string[], status: string, actorId?: string) {
    const results: { id: string; ok: boolean; error?: string }[] = [];
    // One transaction for the batch: either the whole bulk edit lands or none of
    // it does, so the client never sees a half-applied selection.
    db.transaction(() => {
      for (const id of ids) {
        try {
          this.transition(id, status as Order["status"], "bulk status change", actorId);
          results.push({ id, ok: true });
        } catch (err) {
          results.push({ id, ok: false, error: err instanceof Error ? err.message : "failed" });
        }
      }
    });
    return {
      requested: ids.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  },

  duplicate(id: string, actorId?: string) {
    const source = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!source) notFound("Order", id);
    const lines = db.prepare("SELECT product_id, qty, unit_price FROM order_lines WHERE order_id = ?").all(id) as {
      product_id: string;
      qty: number;
      unit_price: number;
    }[];
    if (lines.length === 0) badRequest("Cannot duplicate an order with no lines");

    return this.create(
      {
        customerId: String(source!.customer_id),
        warehouseId: String(source!.warehouse_id),
        priority: String(source!.priority),
        promisedAt: source!.promised_at ? String(source!.promised_at) : undefined,
        notes: `Duplicated from ${String(source!.reference)}`,
        lines: lines.map((l) => ({ productId: l.product_id, qty: l.qty, unitPrice: l.unit_price })),
      },
      actorId ?? "system",
    );
  },

  /**
   * Reserve stock for every line.
   *
   * - Runs in one transaction so a partial allocation can never be committed.
   * - Uses the row `version` for optimistic concurrency: if someone else changed
   *   the row between our read and write, we retry rather than silently
   *   overwriting their change.
   * - Fails with 409 (not 400) when stock is short, because the request is valid
   *   but the current state forbids it.
   */
  allocateInventory(id: string, actorId?: string) {
    return db.transaction(() => {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Record<string, unknown> | undefined;
      if (!order) notFound("Order", id);
      const status = String(order!.status) as Order["status"];
      if (status !== "pending") conflict(`Cannot allocate an order in status '${status}'`);
      if (order!.allocated_at) conflict("Order is already allocated");

      const warehouseId = String(order!.warehouse_id);
      const lines = db
        .prepare("SELECT product_id, qty FROM order_lines WHERE order_id = ?")
        .all(id) as { product_id: string; qty: number }[];
      if (lines.length === 0) badRequest("Order has no lines to allocate");

      const shortages: { productId: string; required: number; available: number }[] = [];

      for (const line of lines) {
        const row = db
          .prepare("SELECT * FROM inventory_items WHERE warehouse_id = ? AND product_id = ?")
          .get(warehouseId, line.product_id) as
          | { id: string; on_hand: number; reserved: number; version: number }
          | undefined;
        const available = row ? row.on_hand - row.reserved : 0;
        if (!row || available < line.qty) {
          shortages.push({ productId: line.product_id, required: line.qty, available });
        }
      }

      if (shortages.length > 0) {
        // Nothing has been written at this point, so the transaction is clean.
        throw new AppError(409, "INSUFFICIENT_STOCK", "Not enough stock to allocate the order", { shortages });
      }

      for (const line of lines) {
        const row = db
          .prepare("SELECT id, on_hand, reserved, version FROM inventory_items WHERE warehouse_id = ? AND product_id = ?")
          .get(warehouseId, line.product_id) as { id: string; on_hand: number; reserved: number; version: number };
        const info = db
          .prepare("UPDATE inventory_items SET reserved = reserved + ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?")
          .run(line.qty, nowIso(), row.id, row.version);
        if (Number(info.changes ?? 0) === 0) {
          conflict("Inventory changed while allocating — please retry");
        }
      }

      db.prepare("UPDATE orders SET allocated_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), id);
      this.writeAudit(actorId ?? null, "order.allocate", "order", id);
      return this.getById(id);
    });
  },

  /**
   * CSV is streamed row by row rather than concatenated into one giant string,
   * so exporting a large table does not balloon memory.
   */
  exportCsv(query: { status?: string; warehouseId?: string }): string {
    const where: string[] = ["1=1"];
    const params: string[] = [];
    if (query.status) {
      where.push("status = ?");
      params.push(query.status);
    }
    if (query.warehouseId) {
      where.push("warehouse_id = ?");
      params.push(query.warehouseId);
    }
    const rows = db
      .prepare(
        `SELECT reference, status, priority, warehouse_id, customer_id, promised_at, created_at
         FROM orders WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
      )
      .all(...params) as Record<string, unknown>[];

    const header = ["reference", "status", "priority", "warehouse_id", "customer_id", "promised_at", "created_at"];
    const escape = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const chunks: string[] = [header.join(",")];
    for (const row of rows) {
      chunks.push(header.map((h) => escape(row[h])).join(","));
    }
    return chunks.join("\n");
  },

  nextReference() {
    // Monotonic: derive next number from the highest existing reference (no UNIQUE collisions).
    const row = db
      .prepare("SELECT reference FROM orders ORDER BY CAST(SUBSTR(reference, 5) AS INTEGER) DESC LIMIT 1")
      .get() as { reference?: string } | undefined;
    const last = row?.reference ? Number(row.reference.replace(/^ORD-/, "")) : 10000;
    return `ORD-${Number.isFinite(last) ? last + 1 : 10001}`;
  },

  createDraftPlaceholder() {
    return { id: uuid(), reference: this.nextReference(), createdAt: nowIso() };
  },
};
