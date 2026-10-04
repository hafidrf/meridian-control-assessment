import { z } from "zod";

export const createOrderSchema = z.object({
  customerId: z.string(),
  warehouseId: z.string(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  promisedAt: z.string().optional(),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string(),
        qty: z.number().int().positive(),
        unitPrice: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1),
});

export const updateOrderSchema = createOrderSchema.partial();

export const transitionSchema = z.object({
  status: z.enum(["pending", "picking", "packed", "shipped", "delivered", "cancelled"]),
  note: z.string().optional(),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  status: z.enum(["pending", "picking", "packed", "shipped", "delivered", "cancelled"]),
});
