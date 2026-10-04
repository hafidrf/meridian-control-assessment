/**
 * List-endpoint latency measurement (C3).
 *
 *   node scripts/perf.mjs [iterations]
 *
 * Requires the API running and the DB seeded with 10k orders:
 *   npm run db:reset -w server && npm run seed:orders -w server -- 10000
 *
 * Reports p50/p95/p99 for the hot list endpoints. Numbers produced on the
 * reviewer machine are pasted into NOTES.md.
 */
const BASE = process.env.PERF_BASE ?? "http://localhost:4000/api";
const ITERATIONS = Number(process.argv[2] ?? 60);

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  return json.tokens.accessToken;
}

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function timeIt(label, path, token, iterations) {
  const samples = [];
  // One warm-up request so JIT/prepared-statement cache is hot.
  await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });

  for (let i = 0; i < iterations; i++) {
    const started = performance.now();
    const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    await res.json();
    if (!res.ok) throw new Error(`${label} returned ${res.status}`);
    samples.push(performance.now() - started);
  }

  samples.sort((a, b) => a - b);
  const p50 = percentile(samples, 50);
  const p95 = percentile(samples, 95);
  const p99 = percentile(samples, 99);
  console.log(
    `${label.padEnd(46)} p50=${p50.toFixed(1)}ms  p95=${p95.toFixed(1)}ms  p99=${p99.toFixed(1)}ms  (n=${iterations})`,
  );
  return { label, p50, p95, p99 };
}

const run = async () => {
  const token = await login("admin@meridian.test", "Admin123!");

  const results = [];
  results.push(await timeIt("GET /orders?page=1&pageSize=25", "/orders?page=1&pageSize=25", token, ITERATIONS));
  results.push(await timeIt("GET /orders?page=50&pageSize=25 (deep page)", "/orders?page=50&pageSize=25", token, ITERATIONS));
  results.push(
    await timeIt("GET /orders?status=pending (indexed filter)", "/orders?status=pending&page=1&pageSize=25", token, ITERATIONS),
  );
  results.push(await timeIt("GET /orders?q=ORD-1 (LIKE search)", "/orders?q=ORD-1&page=1&pageSize=25", token, 30));
  results.push(await timeIt("GET /orders/:id (detail + lines)", "/orders?page=1&pageSize=1", token, 1).then(async () => {
    const list = await fetch(`${BASE}/orders?page=1&pageSize=1`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
    return timeIt("GET /orders/:id (detail + lines)", `/orders/${list.data[0].id}`, token, ITERATIONS);
  }));
  results.push(await timeIt("GET /reports/kpis", "/reports/kpis", token, ITERATIONS));

  console.log("\nSlowest p95:", results.slice().sort((a, b) => b.p95 - a.p95)[0].label);
};

run().catch((err) => {
  console.error("perf run failed:", err.message);
  process.exit(1);
});
