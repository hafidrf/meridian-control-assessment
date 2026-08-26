/**
 * Server order statuses (lowercase, logistics pipeline).
 * Frontend currently uses a different enum — unify them.
 */
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
