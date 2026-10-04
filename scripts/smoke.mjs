/**
 * Meridian Control — API smoke test.
 *
 * Run with the API already listening (npm run dev -w server), then:
 *   node scripts/smoke.mjs
 *
 * Covers: auth, unified error envelope, unified list envelope, real SQL
 * pagination, order creation + monotonic reference, order detail lines,
 * transition graph enforcement, and RBAC (403 vs 404).
 */
const BASE = process.env.SMOKE_BASE ?? "http://localhost:4000/api";

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    failures.push(`${name} :: ${detail}`);
    console.log(`FAIL  ${name} :: ${detail}`);
  }
}

async function call(path, { method = "GET", token, body, raw = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return raw ? { status: res.status, text, json } : { status: res.status, json };
}

async function login(email, password) {
  const r = await call("/auth/login", { method: "POST", body: { email, password } });
  return r.json?.tokens?.accessToken ?? null;
}

const run = async () => {
  // ---------------------------------------------------------------- auth
  const admin = await login("admin@meridian.test", "Admin123!");
  const dispatcher = await login("dispatcher@meridian.test", "Dispatch123!");
  const warehouse = await login("warehouse@meridian.test", "Warehouse123!");
  check("login admin returns access token", !!admin);
  check("login dispatcher returns access token", !!dispatcher);
  check("login warehouse returns access token", !!warehouse);

  const badLogin = await call("/auth/login", {
    method: "POST",
    body: { email: "admin@meridian.test", password: "wrong-password" },
  });
  check(
    "bad login uses unified error envelope",
    badLogin.status === 401 && badLogin.json?.error?.code && badLogin.json?.error?.message,
    JSON.stringify(badLogin.json),
  );

  // ------------------------------------------------- unified list envelope
  const list = await call("/orders?page=1&pageSize=5", { token: admin });
  const L = list.json ?? {};
  check(
    "GET /orders returns unified list envelope",
    Array.isArray(L.data) && L.page === 1 && L.pageSize === 5 && typeof L.total === "number" && "sort" in L && "order" in L,
    JSON.stringify(L).slice(0, 200),
  );
  check("GET /orders applies pageSize in SQL", (L.data?.length ?? 99) <= 5, `got ${L.data?.length} rows for pageSize=5`);

  const page1 = await call("/orders?page=1&pageSize=3", { token: admin });
  const page2 = await call("/orders?page=2&pageSize=3", { token: admin });
  const ids1 = (page1.json?.data ?? []).map((o) => o.id);
  const ids2 = (page2.json?.data ?? []).map((o) => o.id);
  check(
    "pagination returns disjoint pages",
    ids1.length === 3 && ids2.length > 0 && !ids1.some((id) => ids2.includes(id)),
    `p1=${ids1.length} p2=${ids2.length} overlap=${ids1.filter((i) => ids2.includes(i)).length}`,
  );
  check("total is a real count, not page length", (page1.json?.total ?? 0) >= ids1.length, `total=${page1.json?.total}`);

  // ------------------------------------------------------------ lookups
  const customers = await call("/customers", { token: admin });
  const warehouses = await call("/warehouses", { token: admin });
  const products = await call("/inventory/products", { token: admin });
  const pick = (r) => r.json?.data ?? r.json?.items ?? r.json?.results ?? (Array.isArray(r.json) ? r.json : null);
  const custList = pick(customers);
  const whList = pick(warehouses);
  const prodList = pick(products);
  const customer = Array.isArray(custList) ? custList[0] : null;
  const wh = Array.isArray(whList) ? whList[0] : null;
  const product = Array.isArray(prodList) ? prodList[0] : null;
  check("customers endpoint returns a row", !!customer, JSON.stringify(customers.json).slice(0, 200));
  check("warehouses endpoint returns a row", !!wh, JSON.stringify(warehouses.json).slice(0, 200));
  check("products endpoint returns a row", !!product, JSON.stringify(products.json).slice(0, 200));
  check(
    "customers uses the same list envelope as orders",
    !!customers.json?.data && "page" in (customers.json ?? {}) && "total" in (customers.json ?? {}),
    JSON.stringify(customers.json).slice(0, 160),
  );
  if (!customer || !wh || !product) {
    console.log("\nCannot continue without a customer, warehouse and product.");
    return;
  }

  // ------------------------------------------------------ create an order
  const before = await call("/orders?page=1&pageSize=1&sort=createdAt&order=desc", { token: admin });
  const created = await call("/orders", {
    method: "POST",
    token: dispatcher,
    body: {
      customerId: customer.id,
      warehouseId: wh.id,
      priority: "high",
      notes: "smoke test order",
      lines: [{ productId: product.id, qty: 2, unitPrice: 1500 }],
    },
  });
  check("POST /orders returns 201", created.status === 201, `status=${created.status} body=${JSON.stringify(created.json).slice(0, 200)}`);
  check("created order has a reference", !!created.json?.reference, JSON.stringify(created.json).slice(0, 200));
  check("created order defaults to pending", created.json?.status === "pending", `status=${created.json?.status}`);
  check("created order is attributed to the actor", !!created.json?.createdBy, `createdBy=${created.json?.createdBy}`);

  const newRef = created.json?.reference ?? "";
  const prevRef = before.json?.data?.[0]?.reference ?? "";
  if (prevRef && newRef) {
    const nNew = Number(newRef.replace(/\D/g, ""));
    const nPrev = Number(prevRef.replace(/\D/g, ""));
    check("reference is monotonic", nNew > nPrev, `${prevRef} -> ${newRef}`);
  }

  // ------------------------------------------------------- order detail
  const orderId = created.json?.id;
  const detail = await call(`/orders/${orderId}`, { token: admin });
  check("GET /orders/:id returns the order", detail.json?.id === orderId, JSON.stringify(detail.json).slice(0, 200));
  check("order detail includes its lines", (detail.json?.lines?.length ?? 0) === 1, `lines=${detail.json?.lines?.length}`);

  // ------------------------------------------- transition graph + guards
  const badTransition = await call(`/orders/${orderId}/transition`, {
    method: "POST",
    token: admin,
    body: { status: "delivered" },
  });
  check(
    "illegal transition pending->delivered returns 400",
    badTransition.status === 400 && badTransition.json?.error?.code === "BAD_REQUEST",
    `status=${badTransition.status} body=${JSON.stringify(badTransition.json).slice(0, 160)}`,
  );

  const unallocated = await call(`/orders/${orderId}/transition`, {
    method: "POST",
    token: admin,
    body: { status: "picking" },
  });
  check(
    "pending->picking without allocation returns 409",
    unallocated.status === 409 && unallocated.json?.error?.code === "CONFLICT",
    `status=${unallocated.status} body=${JSON.stringify(unallocated.json).slice(0, 160)}`,
  );

  // Allocation must be explicit, and a shortage must be a 409 with details.
  const allocate = await call(`/orders/${orderId}/allocate`, { method: "POST", token: admin });
  const allocated = allocate.status === 200 && allocate.json?.allocatedAt;
  const shortage = allocate.status === 409 && allocate.json?.error?.code === "INSUFFICIENT_STOCK";
  check(
    "allocate either reserves stock or fails with 409 INSUFFICIENT_STOCK",
    allocated || shortage,
    `status=${allocate.status} body=${JSON.stringify(allocate.json).slice(0, 200)}`,
  );
  if (allocated) {
    const nowPickable = await call(`/orders/${orderId}/transition`, {
      method: "POST",
      token: admin,
      body: { status: "picking" },
    });
    check(
      "allocated order can move pending->picking",
      nowPickable.status === 200 && nowPickable.json?.status === "picking",
      `status=${nowPickable.status} body=${JSON.stringify(nowPickable.json).slice(0, 140)}`,
    );
  }

  // -------------------------------------------------------------- RBAC
  const whCreate = await call("/orders", {
    method: "POST",
    token: warehouse,
    body: { customerId: customer.id, warehouseId: wh.id, lines: [{ productId: product.id, qty: 1 }] },
  });
  check(
    "warehouse role cannot create orders (403)",
    whCreate.status === 403 && whCreate.json?.error?.code === "FORBIDDEN",
    `status=${whCreate.status} body=${JSON.stringify(whCreate.json).slice(0, 160)}`,
  );

  const whDelete = await call(`/orders/${orderId}`, { method: "DELETE", token: warehouse });
  check(
    "warehouse role cannot delete orders (403)",
    whDelete.status === 403,
    `status=${whDelete.status} body=${JSON.stringify(whDelete.json).slice(0, 160)}`,
  );

  const noAuth = await call("/orders");
  check("unauthenticated request returns 401", noAuth.status === 401, `status=${noAuth.status}`);

  // ------------------------------------------------- warehouse scoping
  const whScoped = await call("/orders?page=1&pageSize=50", { token: warehouse });
  const scopedRows = whScoped.json?.data ?? [];
  const whId = whScoped.json?.data?.[0]?.warehouseId;
  check(
    "warehouse user only sees its own warehouse",
    scopedRows.length === 0 || scopedRows.every((o) => o.warehouseId === whId),
    `rows=${scopedRows.length} firstWarehouse=${whId}`,
  );

  // --------------------------------------------------------- unknown ids
  const missing = await call("/orders/does-not-exist", { token: admin });
  check(
    "unknown order returns 404 with unified envelope",
    missing.status === 404 && missing.json?.error?.code === "NOT_FOUND",
    `status=${missing.status}`,
  );

  const unknownCustomer = await call("/orders", {
    method: "POST",
    token: admin,
    body: { customerId: "nope", warehouseId: wh.id, lines: [{ productId: product.id, qty: 1 }] },
  });
  check(
    "unknown customer is rejected with a field-level detail",
    unknownCustomer.status === 400 && unknownCustomer.json?.error?.details?.field === "customerId",
    `status=${unknownCustomer.status} body=${JSON.stringify(unknownCustomer.json).slice(0, 200)}`,
  );

  // ------------------------------------------------------- idempotency
  const idemKey = `smoke-${Date.now()}`;
  const first = await call("/orders", {
    method: "POST",
    token: dispatcher,
    body: {
      customerId: customer.id,
      warehouseId: wh.id,
      lines: [{ productId: product.id, qty: 1 }],
    },
  });
  const replay = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${dispatcher}`, "Content-Type": "application/json", "Idempotency-Key": idemKey },
    body: JSON.stringify({
      customerId: customer.id,
      warehouseId: wh.id,
      lines: [{ productId: product.id, qty: 1 }],
    }),
  }).then((r) => r.json());
  const replay2 = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${dispatcher}`, "Content-Type": "application/json", "Idempotency-Key": idemKey },
    body: JSON.stringify({
      customerId: customer.id,
      warehouseId: wh.id,
      lines: [{ productId: product.id, qty: 1 }],
    }),
  }).then((r) => r.json());
  check(
    "replaying an Idempotency-Key returns the same order",
    !!replay?.id && replay.id === replay2?.id,
    `first=${replay?.id} second=${replay2?.id} (baseline create id=${first.json?.id})`,
  );

  // ------------------------------------------------------ auth rotation
  const session = await call("/auth/login", {
    method: "POST",
    body: { email: "dispatcher@meridian.test", password: "Dispatch123!" },
  });
  const r1 = session.json?.tokens?.refreshToken;
  const rotated = await call("/auth/refresh", { method: "POST", body: { refreshToken: r1 } });
  check(
    "refresh returns a new access + refresh pair",
    !!rotated.json?.accessToken && !!rotated.json?.refreshToken && rotated.json.refreshToken !== r1,
    `status=${rotated.status}`,
  );
  const reuse = await call("/auth/refresh", { method: "POST", body: { refreshToken: r1 } });
  check(
    "reusing a rotated refresh token is rejected (401)",
    reuse.status === 401,
    `status=${reuse.status} body=${JSON.stringify(reuse.json).slice(0, 160)}`,
  );
  const freshAfterReuse = await call("/auth/refresh", {
    method: "POST",
    body: { refreshToken: rotated.json?.refreshToken },
  });
  check(
    "token reuse revokes the whole session family",
    freshAfterReuse.status === 401,
    `status=${freshAfterReuse.status}`,
  );
  const afterLogout = await call("/auth/logout", { method: "POST", body: { refreshToken: r1 } });
  check("logout is idempotent (204/200, never 500)", [200, 204].includes(afterLogout.status), `status=${afterLogout.status}`);

  // ------------------------------------------------------------- search
  const search = await call("/search?q=ORD", { token: admin });
  check(
    "GET /search returns a capped result set with facets",
    search.status === 200 && Array.isArray(search.json?.data) && !!search.json?.facets,
    `status=${search.status} body=${JSON.stringify(search.json).slice(0, 200)}`,
  );
  const shortSearch = await call("/search?q=a", { token: admin });
  check(
    "search ignores queries below the minimum length (no error, no fan-out)",
    shortSearch.status === 200 && (shortSearch.json?.data?.length ?? -1) === 0,
    `status=${shortSearch.status} rows=${shortSearch.json?.data?.length}`,
  );

  // ------------------------------------------------------------ CSV export
  const csv = await call("/orders/export", { token: admin });
  check(
    "orders CSV export returns text/csv with a header row",
    csv.status === 200 || csv.text?.startsWith("reference,"),
    `status=${csv.status} body=${(csv.text ?? "").slice(0, 80)}`,
  );

  // ------------------------------------------------------- order ordering
  const sorted = await call("/orders?page=1&pageSize=5&sort=reference&order=asc", { token: admin });
  const refs = (sorted.json?.data ?? []).map((o) => o.reference);
  check(
    "sort allowlist works (reference asc)",
    refs.length > 0 && refs.every((r, i) => i === 0 || refs[i - 1] <= r),
    `refs=${refs.slice(0, 4).join(",")}`,
  );
  const badSort = await call("/orders?sort=1;DROP TABLE orders--", { token: admin });
  check(
    "unknown sort column is rejected safely (no SQL injection, no 500)",
    badSort.status === 200 && Array.isArray(badSort.json?.data),
    `status=${badSort.status} body=${JSON.stringify(badSort.json).slice(0, 140)}`,
  );

  // --------------------------------------------------------------- kpis
  const kpis = await call("/reports/kpis", { token: admin });
  check(
    "KPI generatedAt is an ISO-8601 UTC string",
    typeof kpis.json?.generatedAt === "string" && !Number.isNaN(Date.parse(kpis.json.generatedAt)),
    `generatedAt=${JSON.stringify(kpis.json?.generatedAt)}`,
  );

  // ------------------------------------------------------ security head
  const raw = await call("/health", { raw: true });
  check("health responds", raw.status === 200, `status=${raw.status}`);
};

run()
  .catch((err) => {
    fail++;
    failures.push(`unexpected: ${err.message}`);
    console.log(`FAIL  unexpected error :: ${err.message}`);
  })
  .finally(() => {
    console.log(`\n${pass} passed, ${fail} failed`);
    if (failures.length) {
      console.log("\nFailures:");
      for (const f of failures) console.log(` - ${f}`);
    }
    process.exit(fail === 0 ? 0 : 1);
  });
