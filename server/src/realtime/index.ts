import type { Server } from "node:http";
import { logger } from "../utils/logger.js";

/**
 * WebSocket / SSE placeholder.
 * Wire a real implementation (ws, socket.io, or SSE) for live shipment events.
 */
export function attachRealtime(_server: Server) {
  logger.info("realtime transport not attached");
}

export function broadcast(_event: string, _payload: unknown) {
  // no-op in starter
}
