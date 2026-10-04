// Contract shared with the server (see NOTES.md): statuses and roles are lowercase.
export type Role = "admin" | "dispatcher" | "warehouse" | "driver" | "viewer";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  warehouseId?: string;
};

export type OrderStatus = "pending" | "picking" | "packed" | "shipped" | "delivered" | "cancelled";
export type OrderPriority = "low" | "normal" | "high" | "urgent";

export type OrderLine = {
  id: string;
  orderId: string;
  productId: string;
  qty: number;
  qtyPicked: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  reference: string;
  customerId: string;
  warehouseId: string;
  status: OrderStatus;
  priority: OrderPriority;
  promisedAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: OrderLine[];
};

export type Shipment = {
  id: string;
  tracking: string;
  orderId: string;
  status: string;
  eta?: string;
};

export type Warehouse = {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
};

export type InventoryRow = {
  id: string;
  sku: string;
  onHand: number;
  reserved: number;
  warehouse: string;
};

export type KpiPayload = {
  openOrders: number;
  activeShipments: number;
  lowStockSkus: number;
  onTimePct: number;
  generatedAt: string;
};

/** Unified error envelope: { error: { code, message, details? } } */
export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/** Unified list envelope: { data, page, pageSize, total, sort, order } */
export type ListEnvelope<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  sort: string;
  order: "asc" | "desc";
};
