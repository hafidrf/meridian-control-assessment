import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { seed } from "./db/seed.js";
import { attachRealtime } from "./realtime/index.js";
import { logger } from "./utils/logger.js";

seed();

const app = createApp();
const server = app.listen(env.port, () => {
  logger.info(`Meridian API listening on :${env.port}`);
});

attachRealtime(server);
