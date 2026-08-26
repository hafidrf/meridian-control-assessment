import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import type { Order } from "../types";

export const ordersApi = {
  list: (page = 1, pageSize = 25, status?: string) => {
    const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) q.set("status", status);
    return apiGet<{ items: Order[]; total: number }>(`/orders?${q.toString()}`);
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
