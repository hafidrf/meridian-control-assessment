import fs from "node:fs";
import { seed } from "./seed.js";
import { logger } from "../utils/logger.js";
import { db, resolveDbPath } from "./client.js";

const dbPath = resolveDbPath();
db.close();
if (fs.existsSync(dbPath)) {
  fs.rmSync(dbPath);
  for (const extra of [`${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(extra)) fs.rmSync(extra);
  }
}
db.reopen();
seed();
logger.info("Database reset and seeded", { dbPath });
