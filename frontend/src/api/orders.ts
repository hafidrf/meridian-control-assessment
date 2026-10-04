import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import type { ListEnvelope, Order } from "../types";

export const ordersApi = {
  list: (page = 1, pageSize = 25, status?: string, q?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    return apiGet<ListEnvelope<Order>>(`/orders?${params.toString()}`);
  },
  get: (id: string) => apiGet<Order>(`/orders/${id}`),
  create: (body: unknown) => apiPost<Order>("/orders", body),
  update: (id: string, body: unknown) => apiPatch<Order>(`/orders/${id}`, body),
  remove: (id: string) => apiDelete(`/orders/${id}`),
  transition: (id: string, status: string) => apiPost<Order>(`/orders/${id}/transition`, { status }),
  bulkStatus: (ids: string[], status: string) => apiPost("/orders/bulk-status", { ids, status }),
  duplicate: (id: string) => apiPost<Order>(`/orders/${id}/duplicate`),
  allocate: (id: string) => apiPost(`/orders/${id}/allocate`),
  exportCsv: () => apiGet<string>("/orders/export"),
};
