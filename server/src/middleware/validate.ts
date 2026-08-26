import type { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { badRequest } from "../utils/errors.js";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      badRequest("Validation failed", parsed.error.flatten());
    }
    req[source] = parsed.data;
    next();
  };
}
