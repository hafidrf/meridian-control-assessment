import { Router } from "express";
import { db } from "../../db/client.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", service: "meridian-api", ts: new Date().toISOString() });
});

healthRouter.get("/ready", (_req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

healthRouter.get("/metrics", (_req, res) => {
  res.json({
    uptimeSec: process.uptime(),
    memory: process.memoryUsage(),
  });
});
