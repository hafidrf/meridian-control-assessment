import { Router } from "express";
import { db } from "../../db/client.js";
import { requireAuth } from "../../middleware/auth.js";
import { listResponse } from "../../utils/respond.js";
import type { PaginationQuery } from "../../types/index.js";
import type { Request, Response } from "express";

export const searchRouter = Router();
searchRouter.use(requireAuth);

/**
 * GET /api/search?q=&types=order,shipment,customer,product
 *
 * One query across the four entities the shell palette needs, capped per type
 * so a single keystroke can never scan a whole table set. A minimum query
 * length is enforced so `/api/search?q=a` does not fan out across every row.
 */
const MIN_QUERY_LENGTH = 2;
const PER_TYPE_LIMIT = 5;

searchRouter.get("/", (req: Request, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  const requested = String(req.query.types ?? "order,shipment,customer,product")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // Short queries return an empty, well-formed result rather than an error:
  // the palette simply has nothing to show yet.
  if (q.length < MIN_QUERY_LENGTH) {
    res.json({ data: [], page: 1, pageSize: 25, total: 0, sort: "relevance", order: "desc", facets: {}, q });
    return;
  }

  const like = `%${q}%`;
  const results: { type: string; id: string; label: string; detail?: string }[] = [];

  if (requested.includes("order")) {
    const rows = db
      .prepare("SELECT id, reference, status FROM orders WHERE reference LIKE ? ORDER BY created_at DESC LIMIT ?")
      .all(like, PER_TYPE_LIMIT) as { id: string; reference: string; status: string }[];
    for (const r of rows) results.push({ type: "order", id: r.id, label: r.reference, detail: r.status });
  }

  if (requested.includes("shipment")) {
    const rows = db
      .prepare("SELECT id, tracking_no, status FROM shipments WHERE tracking_no LIKE ? ORDER BY created_at DESC LIMIT ?")
      .all(like, PER_TYPE_LIMIT) as { id: string; tracking_no: string; status: string }[];
    for (const r of rows) results.push({ type: "shipment", id: r.id, label: r.tracking_no, detail: r.status });
  }

  if (requested.includes("customer")) {
    const rows = db
      .prepare("SELECT id, code, name FROM customers WHERE name LIKE ? OR code LIKE ? LIMIT ?")
      .all(like, like, PER_TYPE_LIMIT) as { id: string; code: string; name: string }[];
    for (const r of rows) results.push({ type: "customer", id: r.id, label: r.name, detail: r.code });
  }

  if (requested.includes("product")) {
    const rows = db
      .prepare("SELECT id, sku, name FROM products WHERE sku LIKE ? OR name LIKE ? LIMIT ?")
      .all(like, like, PER_TYPE_LIMIT) as { id: string; sku: string; name: string }[];
    for (const r of rows) results.push({ type: "product", id: r.id, label: r.sku, detail: r.name });
  }

  // `facets` lets the palette group results without a second round trip.
  const facets: Record<string, number> = {};
  for (const r of results) facets[r.type] = (facets[r.type] ?? 0) + 1;

  const envelope = { data: results, page: 1, pageSize: PER_TYPE_LIMIT, total: results.length, sort: "relevance", order: "desc" as const };
  res.json({ ...envelope, facets, q });
});
