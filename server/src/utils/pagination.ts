import type { PaginationQuery } from "../types/index.js";

/**
 * Starter helper. Query params are not unified yet:
 * some clients send page/pageSize, others send offset/limit, others send cursor.
 * Candidates should pick one contract and apply it everywhere.
 */
export function parsePagination(query: PaginationQuery) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? query.limit ?? 25);
  const offset = Number(query.offset ?? (page - 1) * pageSize);
  const limit = pageSize;
  return { page, pageSize, offset, limit, sort: query.sort, order: query.order ?? "desc", cursor: query.cursor };
}
