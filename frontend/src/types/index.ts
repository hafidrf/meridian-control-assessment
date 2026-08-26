export type Role = "ADMIN" | "DISPATCHER" | "WAREHOUSE" | "DRIVER" | "VIEWER";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  warehouseId?: string;
};

export type OrderStatus = "PENDING" | "IN_PROGRESS" | "COMPLETE" | "CANCELLED";

export type Order = {
  id: string;
  ref: string;
  customerId: string;
  warehouseId: string;
  status: OrderStatus;
  priority: string;
  promisedAt?: number;
  notes?: string;
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
  onHand: string;
  reserved: string;
  warehouse: string;
};

export type KpiPayload = {
  openOrders: number;
  activeShipments: number;
  lowStockSkus: number;
  onTimePct: number;
  generatedAt: string;
};

export type ApiError = {
  message: string;
};
