import { apiGet, apiPatch, apiPost } from "./client";
import type { InventoryRow, KpiPayload, Shipment, User, Warehouse } from "../types";

export const shipmentsApi = {
  list: (status?: string) => apiGet<{ data: Shipment[] }>(`/shipments${status ? `?status=${status}` : ""}`),
  get: (id: string) => apiGet<Shipment>(`/shipments/${id}`),
  track: (trackingNo: string) => apiGet<Shipment>(`/shipments/track/${trackingNo}`),
  create: (body: unknown) => apiPost<Shipment>("/shipments", body),
  assign: (id: string, driverId: string, vehicleId: string) =>
    apiPost(`/shipments/${id}/assign`, { driverId, vehicleId }),
  addEvent: (id: string, body: unknown) => apiPost(`/shipments/${id}/events`, body),
};

export const inventoryApi = {
  products: () => apiGet<{ data: unknown[] }>("/inventory/products"),
  levels: (warehouseId?: string) =>
    apiGet<{ data: InventoryRow[] }>(`/inventory/levels${warehouseId ? `?warehouseId=${warehouseId}` : ""}`),
  adjust: (body: unknown) => apiPost("/inventory/adjust", body),
  reserve: (body: unknown) => apiPost("/inventory/reserve", body),
  transfer: (body: unknown) => apiPost("/inventory/transfer", body),
  lowStock: () => apiGet("/inventory/low-stock"),
};

export const warehousesApi = {
  list: () => apiGet<{ data: Warehouse[] }>("/warehouses"),
  get: (id: string) => apiGet<Warehouse>(`/warehouses/${id}`),
  create: (body: unknown) => apiPost<Warehouse>("/warehouses", body),
};

export const customersApi = {
  list: (q?: string) => apiGet<{ data: unknown[] }>(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  get: (id: string) => apiGet(`/customers/${id}`),
  create: (body: unknown) => apiPost("/customers", body),
  update: (id: string, body: unknown) => apiPatch(`/customers/${id}`, body),
};

export const fleetApi = {
  vehicles: () => apiGet<{ data: unknown[] }>("/fleet/vehicles"),
  drivers: () => apiGet<{ data: unknown[] }>("/fleet/drivers"),
  availability: () => apiGet("/fleet/availability"),
  createVehicle: (body: unknown) => apiPost("/fleet/vehicles", body),
  createDriver: (body: unknown) => apiPost("/fleet/drivers", body),
  assignVehicle: (driverId: string, vehicleId: string) =>
    apiPost(`/fleet/drivers/${driverId}/assign-vehicle`, { vehicleId }),
};

export const reportsApi = {
  kpis: () => apiGet<KpiPayload>("/reports/kpis"),
  ordersByStatus: () => apiGet("/reports/orders-by-status"),
  throughput: () => apiGet("/reports/throughput"),
  sla: () => apiGet("/reports/sla"),
};

export const usersApi = {
  list: () => apiGet<{ users: User[] }>("/users"),
  get: (id: string) => apiGet<User>(`/users/${id}`),
  create: (body: unknown) => apiPost<User>("/users", body),
};

export const notificationsApi = {
  list: () => apiGet<{ data: unknown[] }>("/notifications"),
  markRead: (id: string) => apiPost(`/notifications/${id}/read`),
  markAllRead: () => apiPost("/notifications/read-all"),
};

export const auditApi = {
  list: () => apiGet<{ data: unknown[] }>("/audit"),
};

export const webhooksApi = {
  list: () => apiGet("/webhooks"),
  create: (body: unknown) => apiPost("/webhooks", body),
  test: (id: string) => apiPost(`/webhooks/${id}/test`),
};

export const uploadsApi = {
  list: () => apiGet("/uploads"),
};

export const searchApi = {
  query: (q: string) => apiGet(`/search?q=${encodeURIComponent(q)}`),
};
