import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveDbPath() {
  const p = path.isAbsolute(env.databasePath)
    ? env.databasePath
    : path.resolve(__dirname, "../..", env.databasePath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

class DbFacade {
  inner: DatabaseSync;

  constructor() {
    this.inner = new DatabaseSync(resolveDbPath());
  }

  prepare(sql: string) {
    return this.inner.prepare(sql);
  }

  exec(sql: string) {
    return this.inner.exec(sql);
  }

  close() {
    this.inner.close();
  }

  reopen() {
    try {
      this.inner.close();
    } catch {
      // already closed
    }
    this.inner = new DatabaseSync(resolveDbPath());
  }
}

export const db = new DbFacade();

export function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(sql);
}

export function nowIso() {
  return new Date().toISOString();
}
