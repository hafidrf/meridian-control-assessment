import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db, migrate, nowIso } from "./client.js";

const PASSWORD = {
  admin: "Admin123!",
  dispatcher: "Dispatch123!",
  warehouse: "Warehouse123!",
  viewer: "Viewer123!",
};

export function seed() {
  migrate();

  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c > 0) return;

  const ts = nowIso();
  const wh1 = uuid();
  const wh2 = uuid();
  const cust1 = uuid();
  const cust2 = uuid();
  const p1 = uuid();
  const p2 = uuid();
  const p3 = uuid();
  const adminId = uuid();
  const dispId = uuid();
  const whUserId = uuid();
  const viewerId = uuid();
  const vehicleId = uuid();
  const driverId = uuid();
  const orderId = uuid();
  const shipmentId = uuid();

  const insertWh = db.prepare(
    `INSERT INTO warehouses (id, code, name, city, country, timezone, capacity_units, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertWh.run(wh1, "NYC-01", "Hudson Terminal", "New York", "US", "America/New_York", 12000, ts);
  insertWh.run(wh2, "ROT-01", "Maasvlakte Hub", "Rotterdam", "NL", "Europe/Amsterdam", 18000, ts);

  const insertUser = db.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, warehouse_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );
  insertUser.run(adminId, "admin@meridian.test", bcrypt.hashSync(PASSWORD.admin, 10), "Amina Okonkwo", "admin", null, ts, ts);
  insertUser.run(dispId, "dispatcher@meridian.test", bcrypt.hashSync(PASSWORD.dispatcher, 10), "Leo Marsh", "dispatcher", wh1, ts, ts);
  insertUser.run(whUserId, "warehouse@meridian.test", bcrypt.hashSync(PASSWORD.warehouse, 10), "Priya Shah", "warehouse", wh1, ts, ts);
  // Read-only account: exists so the "viewers are read-only" rule is demonstrable
  // rather than asserted. Added by the candidate; the three starter accounts above
  // are unchanged.
  insertUser.run(viewerId, "viewer@meridian.test", bcrypt.hashSync(PASSWORD.viewer, 10), "Sam Ito", "viewer", null, ts, ts);

  const insertCust = db.prepare(
    `INSERT INTO customers (id, code, name, email, phone, billing_city, credit_limit, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertCust.run(cust1, "ACME", "Acme Retail Group", "ops@acme.example", "+1-212-555-0101", "Newark", 250000, ts);
  insertCust.run(cust2, "NORD", "Nordic Lights AB", "logistics@nordic.example", "+46-8-555-0199", "Stockholm", 90000, ts);

  const insertProd = db.prepare(
    `INSERT INTO products (id, sku, name, description, unit, weight_kg, hazmat, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertProd.run(p1, "SKU-LED-40", "40W LED High Bay", "Warehouse lighting", "ea", 1.8, 0, ts);
  insertProd.run(p2, "SKU-WRAP-200", "Stretch Wrap 2000ft", "Pallet wrap", "roll", 4.2, 0, ts);
  insertProd.run(p3, "SKU-BATT-Li", "Lithium Pack 24V", "Restricted battery pack", "ea", 3.1, 1, ts);

  const insertInv = db.prepare(
    `INSERT INTO inventory_items (id, warehouse_id, product_id, on_hand, reserved, reorder_point, version, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
  );
  insertInv.run(uuid(), wh1, p1, 420, 40, 80, ts);
  insertInv.run(uuid(), wh1, p2, 90, 12, 30, ts);
  insertInv.run(uuid(), wh1, p3, 18, 6, 10, ts);
  insertInv.run(uuid(), wh2, p1, 210, 0, 50, ts);

  db.prepare(
    `INSERT INTO vehicles (id, plate, type, capacity_kg, status, warehouse_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(vehicleId, "NY-4421-M", "box_truck", 4500, "available", wh1, ts);

  db.prepare(
    `INSERT INTO drivers (id, user_id, name, license_no, phone, status, vehicle_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(driverId, null, "Diego Alvarez", "NY-CDL-88421", "+1-917-555-0144", "on_shift", vehicleId, ts);

  db.prepare(
    `INSERT INTO orders (id, reference, customer_id, warehouse_id, status, priority, promised_at, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(orderId, "ORD-10041", cust1, wh1, "pending", "high", ts, "Dock 3 preferred", adminId, ts, ts);

  db.prepare(
    `INSERT INTO order_lines (id, order_id, product_id, qty, qty_picked, unit_price) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(uuid(), orderId, p1, 24, 0, 8900);
  db.prepare(
    `INSERT INTO order_lines (id, order_id, product_id, qty, qty_picked, unit_price) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(uuid(), orderId, p2, 6, 0, 2100);

  db.prepare(
    `INSERT INTO shipments (id, tracking_no, order_id, driver_id, vehicle_id, status, origin_warehouse_id, dest_city, dest_country, eta, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(shipmentId, "TRK-88021", orderId, driverId, vehicleId, "created", wh1, "Boston", "US", ts, ts, ts);

  db.prepare(
    `INSERT INTO shipment_events (id, shipment_id, status, note, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(uuid(), shipmentId, "created", "Label printed", 40.71, -74.0, ts);

  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(uuid(), dispId, "order.created", "New high-priority order", "ORD-10041 needs dispatch window", null, ts);

  db.prepare(
    `INSERT INTO audit_logs (id, actor_id, action, resource, resource_id, ip, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(uuid(), adminId, "seed", "system", null, "127.0.0.1", JSON.stringify({ source: "seed" }), ts);

  db.prepare(
    `INSERT INTO webhook_endpoints (id, url, secret, events, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)`,
  ).run(uuid(), "https://example.invalid/hooks/meridian", "whsec_dev_placeholder", "order.created,shipment.updated", ts);
}
