/**
 * Generate N orders for performance work.
 *
 *   npm run seed:orders -w server -- 10000
 *
 * Inserts in a single transaction with prepared statements so 10k rows stay
 * fast, and refuses to run unless the base seed has already created the
 * customers/warehouses/products it needs.
 */
import { v4 as uuid } from "uuid";
import { db, migrate, nowIso } from "./client.js";

const count = Number(process.argv[2] ?? 10_000);
if (!Number.isFinite(count) || count <= 0) {
  console.error("Usage: npm run seed:orders -w server -- <count>");
  process.exit(1);
}

migrate();

const customers = db.prepare("SELECT id FROM customers").all() as { id: string }[];
const warehouses = db.prepare("SELECT id FROM warehouses").all() as { id: string }[];
const products = db.prepare("SELECT id FROM products").all() as { id: string }[];

if (!customers.length || !warehouses.length || !products.length) {
  console.error("Base seed missing — run `npm run db:reset -w server` first.");
  process.exit(1);
}

// Monotonic starting point so references stay unique with existing rows.
const maxRow = db
  .prepare("SELECT reference FROM orders ORDER BY CAST(SUBSTR(reference, 5) AS INTEGER) DESC LIMIT 1")
  .get() as { reference?: string } | undefined;
const startAt = maxRow?.reference ? Number(maxRow.reference.replace(/^ORD-/, "")) : 10000;

const STATUSES = ["pending", "picking", "packed", "shipped", "delivered", "cancelled"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

const insertOrder = db.prepare(
  `INSERT INTO orders (id, reference, customer_id, warehouse_id, status, priority, promised_at, notes, created_by, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
);
const insertLine = db.prepare(
  "INSERT INTO order_lines (id, order_id, product_id, qty, qty_picked, unit_price) VALUES (?, ?, ?, ?, 0, ?)",
);

const started = Date.now();
let inserted = 0;

db.transaction(() => {
  for (let i = 0; i < count; i++) {
    const id = uuid();
    const status = STATUSES[i % STATUSES.length];
    const createdAt = new Date(Date.now() - (count - i) * 1000).toISOString();
    insertOrder.run(
      id,
      `ORD-${startAt + 1 + i}`,
      customers[i % customers.length].id,
      warehouses[i % warehouses.length].id,
      status,
      PRIORITIES[i % PRIORITIES.length],
      new Date(Date.now() + (i % 14) * 86_400_000).toISOString(),
      createdAt,
      nowIso(),
    );
    insertLine.run(uuid(), id, products[i % products.length].id, (i % 5) + 1, (i % 7) * 100);
    inserted++;
  }
});

const elapsed = Date.now() - started;
console.log(`Seeded ${inserted} orders in ${elapsed} ms (${Math.round((inserted / elapsed) * 1000)} rows/s)`);
