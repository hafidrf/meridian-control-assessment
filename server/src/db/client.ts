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
    // Referential integrity was OFF in the starter, so orphaned rows were
    // silently possible. Enforce it, and use WAL so readers do not block writes.
    this.inner.exec("PRAGMA foreign_keys = ON");
    this.inner.exec("PRAGMA journal_mode = WAL");
    this.inner.exec("PRAGMA busy_timeout = 5000");
  }

  prepare(sql: string) {
    return this.inner.prepare(sql);
  }

  exec(sql: string) {
    return this.inner.exec(sql);
  }

  /**
   * node:sqlite has no `.transaction()` helper (that is better-sqlite3), so we
   * wrap BEGIN/COMMIT/ROLLBACK ourselves. Nested calls reuse the outer txn.
   */
  transaction<T>(fn: () => T): T {
    const alreadyOpen = this.inner.isTransaction;
    if (!alreadyOpen) this.inner.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      if (!alreadyOpen) this.inner.exec("COMMIT");
      return result;
    } catch (err) {
      if (!alreadyOpen) {
        try {
          this.inner.exec("ROLLBACK");
        } catch {
          // rollback may fail if the txn was already aborted
        }
      }
      throw err;
    }
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
    this.inner.exec("PRAGMA foreign_keys = ON");
    this.inner.exec("PRAGMA journal_mode = WAL");
    this.inner.exec("PRAGMA busy_timeout = 5000");
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
