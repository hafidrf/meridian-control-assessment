import fs from "node:fs";
import { seed } from "./seed.js";
import { logger } from "../utils/logger.js";
import { db, resolveDbPath } from "./client.js";

const dbPath = resolveDbPath();
db.close();
if (fs.existsSync(dbPath)) {
  try {
    fs.rmSync(dbPath);
    for (const extra of [`${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(extra)) fs.rmSync(extra);
    }
  } catch (err) {
    // Most common cause: the API dev server is still holding the file (WAL).
    if ((err as NodeJS.ErrnoException).code === "EBUSY") {
      console.error(
        `\nCannot reset: ${dbPath} is locked.\n` +
          "Stop the running API server (npm run dev -w server) and try again.\n",
      );
      process.exit(1);
    }
    throw err;
  }
}
db.reopen();
seed();
logger.info("Database reset and seeded", { dbPath });
