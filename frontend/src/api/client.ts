import type { ApiError } from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

function getToken() {
  return localStorage.getItem("meridian.accessToken");
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Starter client. Error parsing, auth refresh, abort, and typing are incomplete.
 * Response envelopes differ per endpoint — do not assume a single shape.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = data as ApiError;
    throw new HttpError(res.status, err?.message ?? "Request failed", data);
  }
  return data as T;
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
export const apiDelete = (path: string) => api<void>(path, { method: "DELETE" });
