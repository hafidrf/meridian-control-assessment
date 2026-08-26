import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { requestId, auditAfterResponse } from "./middleware/requestContext.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { warehousesRouter } from "./modules/warehouses/warehouses.routes.js";
import { inventoryRouter } from "./modules/inventory/inventory.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { shipmentsRouter } from "./modules/shipments/shipments.routes.js";
import { fleetRouter } from "./modules/fleet/fleet.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { webhooksRouter } from "./modules/webhooks/webhooks.routes.js";
import { uploadsRouter } from "./modules/uploads/uploads.routes.js";
import { searchRouter } from "./modules/search/search.routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(auditAfterResponse);
  app.use("/api/auth/login", rateLimit);

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/warehouses", warehousesRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/shipments", shipmentsRouter);
  app.use("/api/fleet", fleetRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/webhooks", webhooksRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/search", searchRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
