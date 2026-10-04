import type { Response } from "express";
import { parsePagination } from "./pagination.js";
import type { PaginationQuery } from "../types/index.js";

/**
 * Single list envelope for the whole API (documented in NOTES.md):
 *   { data, page, pageSize, total, sort, order }
 *
 * Every collection endpoint must return this shape so the frontend never has
 * to guess between `data`, `items`, `results`, `logs`, `shipments`, …
 */
export function listResponse<T>(
  res: Response,
  rows: T[],
  query: PaginationQuery = {},
  total?: number,
): Response {
  const page = Number(query.page ?? 1) || 1;
  const pageSize = Number(query.pageSize ?? query.limit ?? 25) || 25;
  const order: "asc" | "desc" = query.order === "asc" ? "asc" : "desc";
  return res.json({
    data: rows,
    page,
    pageSize,
    total: total ?? rows.length,
    sort: query.sort ?? "createdAt",
    order,
  });
}

/**
 * Convenience wrapper for endpoints that page in SQL: parses pagination once
 * and returns both the SQL fragment values and the envelope writer.
 */
export function pagedResponse<T>(res: Response, rows: T[], query: PaginationQuery, total: number): Response {
  return listResponse(res, rows, query, total);
}

export { parsePagination };
