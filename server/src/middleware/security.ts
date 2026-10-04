import type { NextFunction, Request, Response } from "express";

/**
 * Hardening headers. This is the subset of helmet that actually matters for a
 * JSON API; we avoid adding a dependency for five static headers.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  // CSP on an API is mostly for the error pages a browser may render.
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

/**
 * Aborts a request that runs too long. Without this, a slow query holds the
 * socket and the client waits forever instead of getting a clean 503.
 */
export function requestTimeout(ms: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(503).json({
          error: { code: "REQUEST_TIMEOUT", message: `Request exceeded ${ms} ms` },
        });
      }
    }, ms);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  };
}
