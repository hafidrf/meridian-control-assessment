import type { NextFunction, Request, Response } from "express";
import { AppError } from "../types/index.js";
import { logger } from "../utils/logger.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  logger.error("unhandled_error", err instanceof Error ? { message: err.message, stack: err.stack } : err);
  return res.status(500).json({
    error: { code: "INTERNAL", message: "Unexpected server error" },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: `No route ${req.method} ${req.path}` },
  });
}
