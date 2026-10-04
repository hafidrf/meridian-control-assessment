import { Router } from "express";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { idempotent } from "../../middleware/idempotency.js";
import { validate } from "../../middleware/validate.js";
import { ordersController } from "./orders.controller.js";
import { bulkStatusSchema, createOrderSchema, transitionSchema, updateOrderSchema } from "./orders.validators.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.get("/", ordersController.list);
// "/export" must stay above "/:id" or Express matches it as an order id.
ordersRouter.get("/export", requireRoles("admin", "dispatcher"), ordersController.exportCsv);
ordersRouter.get("/:id", ordersController.get);
ordersRouter.post(
  "/",
  requireRoles("admin", "dispatcher"),
  idempotent("POST /orders"),
  validate(createOrderSchema),
  ordersController.create,
);
ordersRouter.post("/bulk-status", requireRoles("admin", "dispatcher"), validate(bulkStatusSchema), ordersController.bulkStatus);
ordersRouter.patch("/:id", requireRoles("admin", "dispatcher"), validate(updateOrderSchema), ordersController.update);
ordersRouter.delete("/:id", requireRoles("admin"), ordersController.remove);
// Mutating routes must all be role-guarded: `viewer` is read-only, so it must
// not be able to advance or clone an order.
ordersRouter.post(
  "/:id/transition",
  requireRoles("admin", "dispatcher", "warehouse"),
  validate(transitionSchema),
  ordersController.transition,
);
ordersRouter.post("/:id/duplicate", requireRoles("admin", "dispatcher"), ordersController.duplicate);
ordersRouter.post("/:id/allocate", requireRoles("warehouse", "admin"), ordersController.allocate);
