import { AppError } from "../types/index.js";

export function notImplemented(fn: string): never {
  throw new AppError(501, "NOT_IMPLEMENTED", `${fn} is not implemented`);
}

export function badRequest(message: string, details?: unknown): never {
  throw new AppError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Unauthorized"): never {
  throw new AppError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden"): never {
  throw new AppError(403, "FORBIDDEN", message);
}

export function notFound(resource: string, id?: string): never {
  throw new AppError(404, "NOT_FOUND", id ? `${resource} ${id} not found` : `${resource} not found`);
}

export function conflict(message: string): never {
  throw new AppError(409, "CONFLICT", message);
}
