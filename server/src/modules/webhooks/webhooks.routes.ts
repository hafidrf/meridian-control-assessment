import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client.js";
import { requireAuth, requireRoles } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { notImplemented } from "../../utils/errors.js";
import { listResponse } from "../../utils/respond.js";
import type { PaginationQuery } from "../../types/index.js";
import type { Request, Response } from "express";

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export const webhooksRouter = Router();
webhooksRouter.use(requireAuth, requireRoles("admin"));

webhooksRouter.get("/", (req: Request, res: Response) => {
  // `secret` is deliberately never returned on list (shown once at creation only).
  const rows = db.prepare("SELECT id, url, events, is_active, created_at FROM webhook_endpoints").all();
  listResponse(res, rows as object[], req.query as PaginationQuery);
});

webhooksRouter.post("/", validate(createSchema), (_req, res) => {
  notImplemented("webhooks.create");
  res.status(501).end();
});

webhooksRouter.patch("/:id", (_req, res) => {
  notImplemented("webhooks.update");
  res.status(501).end();
});

webhooksRouter.delete("/:id", (_req, res) => {
  notImplemented("webhooks.remove");
  res.status(501).end();
});

webhooksRouter.post("/:id/test", (_req, res) => {
  notImplemented("webhooks.testDelivery");
  res.status(501).end();
});

webhooksRouter.get("/:id/deliveries", (_req, res) => {
  notImplemented("webhooks.deliveryLog");
  res.status(501).end();
});
