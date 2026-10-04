import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { requestId, auditAfterResponse } from "./middleware/requestContext.js";
import { createRateLimit, rateLimit } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { securityHeaders, requestTimeout } from "./middleware/security.js";
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
  // Hardening headers (helmet-equivalent for the subset that matters here).
  app.use(securityHeaders);
  // A slow handler must never hold a socket open indefinitely.
  app.use(requestTimeout(15_000));
  // CORS is an explicit origin allowlist — never "*" together with credentials.
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(auditAfterResponse);
  // Login is limited per IP with the standard error envelope.
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
  // Search hits several tables per keystroke — it gets its own tighter budget.
  app.use("/api/search", createRateLimit(60, 60_000), searchRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
