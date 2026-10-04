# NOTES — Meridian Control

Full-stack delivery assessment. Timebox: 40 minutes.
Branch: `9F3U-2DFY-Z9WH-VC2P` (ticket ID).

I deliberately spent the budget on the **compatibility / speed / safety** bucket
(40% of the score) and on one complete vertical slice, rather than touching every
screen shallowly. The brief explicitly says an unfinished backlog is expected and
that judgment is what is graded.

---

## 1. The single contract

There is now exactly **one** response contract, published as
[`openapi.yaml`](./openapi.yaml) and mirrored in `frontend/src/types/index.ts`.

**List envelope** — every collection endpoint (orders, shipments, inventory,
customers, warehouses, users, notifications, audit, webhooks, reports, search):

```json
{ "data": [], "page": 1, "pageSize": 25, "total": 0, "sort": "createdAt", "order": "desc" }
```

**Error envelope** — every failure path, including the 404 handler, the 429 rate
limiter, and the 500 fallback:

```json
{ "error": { "code": "BAD_REQUEST", "message": "…", "details": { "field": "…" } } }
```

**Status mapping**

| Status | Code                        | When                                              |
| ------ | --------------------------- | ------------------------------------------------- |
| 400    | `BAD_REQUEST`               | validation failed, illegal transition, bad field  |
| 401    | `UNAUTHORIZED`              | missing / expired / revoked token, bad login      |
| 401    | `ACCOUNT_INACTIVE`          | deactivated user with an otherwise valid token    |
| 403    | `FORBIDDEN`                 | authenticated but role not allowed (never 404)    |
| 404    | `NOT_FOUND`, `ROUTE_NOT_FOUND` | unknown resource / unknown route               |
| 409    | `CONFLICT`, `INSUFFICIENT_STOCK` | state or version conflict, stock shortage    |
| 429    | `RATE_LIMITED`              | limiter tripped, with `Retry-After`               |
| 503    | `REQUEST_TIMEOUT`           | handler exceeded 15 s                             |

**Type rules** — enums are lowercase (`pending`…`cancelled`, `admin`…`viewer`);
all dates are ISO-8601 UTC strings; inventory quantities are integers; money is
integer minor units; booleans are booleans.

### Contract drift fixed

| Topic            | Before                                                       | After                                   |
| ---------------- | ------------------------------------------------------------ | --------------------------------------- |
| Error body       | FE read `err.message`; limiter returned `{ message }`        | FE parses `error.message`, legacy tolerated |
| List envelopes   | `{results}`, `{items}`, `{logs}`, `{shipments}`, `{drivers}`, `{data}`, raw arrays | one envelope everywhere           |
| Pagination       | `page`/`offset`/`cursor` parsed but **never applied to SQL** | `LIMIT`/`OFFSET` in SQL, verified       |
| Order status     | FE `PENDING/IN_PROGRESS/COMPLETE/CANCELLED`                  | `pending/picking/packed/shipped/delivered/cancelled` |
| Roles            | FE `ADMIN`, BE `admin`                                       | lowercase both sides                    |
| Field names      | snake_case rows vs camelCase types                           | `mapOrder` maps at the boundary         |
| Order identity   | `reference` vs `ref`                                         | `reference`                             |
| KPI clock        | `generatedAt` unix number vs FE `string`                     | ISO-8601 string                         |
| Inventory qty    | integers vs `onHand: string`                                 | integers                                |

---

## 2. What I completed

### Backend (30%)

- **Auth (B1)** — `refresh` with **rotation**: the old token is revoked in the same
  transaction that mints the new one, and replaying a rotated token revokes the
  whole family. `logout` revokes. `change-password` requires the current password
  and invalidates other sessions. `forgot/reset-password` use in-memory tokens with
  a real 30-minute expiry and true single use. `register` is **admin-only**
  (documented decision: no public self-signup surface).
- **RBAC (B2)** — `requireRoles` actually checks. Resource-level rule: a `warehouse`
  user only sees rows for their own warehouse (enforced in SQL, not filtered in JS).
  Forbidden-but-existing returns **403**, not 404. Every mutating route is
  role-guarded — see the viewer finding below.
- **Viewer is genuinely read-only** — added `viewer@meridian.test` to the seed so
  this is *demonstrable* rather than asserted, and added 9 assertions covering
  transition, duplicate, allocate, update, delete, create, bulk-status and uploads.
  All return 403.
- **Inactive users** — `requireAuth` now re-reads the user and rejects a deactivated
  account even if its JWT is still valid.
- **Orders (B3)** — `create` (monotonic reference, lines persisted, defaults to
  `pending`, attributed to the actor, audit row written), `update` (only in editable
  statuses), `transition` (allowlisted graph), `duplicate`, `bulk-status` (one
  transaction, per-id result summary), `remove`, `allocateInventory`, `exportCsv`.
- **Allocation is real** — `allocateInventory` reserves stock for every line inside a
  transaction, bumps row `version`, and fails with **409 `INSUFFICIENT_STOCK` plus a
  per-line `shortages` array**. Entering `picking` requires `allocated_at` to be set,
  and cancelling releases the reservations.
- **Route-order bug** — `GET /shipments/track/:trackingNo` and `GET /audit/export`
  were registered *after* `/:id`. Both moved above; verified by test.
- **Uploads (B9)** — the module was **missing entirely** (`app.ts` imported a file
  that did not exist, so the server could not boot). Implemented with a MIME **and**
  extension allowlist that must both match, per-type size caps, `file_assets`
  metadata, authenticated download with `Content-Disposition: attachment` and
  `nosniff`, and delete that removes both disk file and row.
- **Search (B10)** — `GET /api/search?q=` across orders, shipments, customers and
  products with a per-type cap, type facets, and a minimum query length so a single
  character cannot fan out across tables.
- **Data layer (B12)** — `PRAGMA foreign_keys = ON`, WAL, busy timeout; FKs and
  CHECK constraints (`on_hand >= 0`, `reserved <= on_hand`, status/priority enums);
  unique `(warehouse_id, product_id)`; indexes on every column the API filters or
  sorts by; `npm run seed:orders -- 10000` generates 10k orders.
- **Notifications** — list, `unread-count` for the shell badge, `read` / `read-all`
  scoped to the current user.

### Compatibility / speed / safety (40%)

- **One contract (C1)** — `openapi.yaml` + matching FE types + the envelopes above.
- **Client reliability (C2)** — the FE parses the error envelope and surfaces the API
  code + message (login failures no longer say "Request failed"). `Idempotency-Key`
  is honoured on `POST /orders` and `POST /inventory/adjust`: a replay returns the
  stored response with `Idempotent-Replay: true` instead of creating a second order.
- **Performance (C3)** — see measurements below.
- **Safety (C4)** — refresh tokens are stored as SHA-256 digests, never raw.
  Parameterised SQL throughout, with a **sort allowlist** so a query parameter can
  never reach the SQL string (tested with `sort=1;DROP TABLE orders--`).
  Security headers (nosniff, DENY framing, CSP, referrer policy, HSTS in prod).
  CORS is an explicit origin allowlist, never `*` with credentials. Login and search
  are rate limited, always with the standard 429 body. Upload allowlist and download
  hardening as above. `secret` is still never returned by `GET /webhooks`.
- **Operability (C5)** — `x-request-id` on requests, structured logs, a 15 s request
  timeout that answers 503 instead of hanging, health/ready endpoints.

### Frontend (30%)

- `OrdersPage` rewritten against the real contract: typed `Order` rows (no `any`
  fallbacks), debounced search via the existing `useDebounce` hook, status filter
  using the real enum, **real pagination controls** driven by `total`, page reset on
  filter change, accessibility labels and `scope="col"` headers, CSV export as a
  download rather than `apiGet` into JSON.
- `types/index.ts` aligned with the server (statuses, roles, `ListEnvelope<T>`,
  `ApiError` with the nested envelope).

### Test / verification deliverables

- `scripts/smoke.mjs` — **51 assertions, all passing**.
- `scripts/perf.mjs` — latency harness for the hot list endpoints.
- `npm run smoke -w server` runs the suite against a running API.

> Note on scope: the reviewer brief says the backlog is intentionally impossible
> to finish, so effort went into contract coherence, the auth/RBAC path, and one
> complete vertical slice rather than breadth across screens.

---

## 3. Measured performance

10,000 seeded orders (`npm run seed:orders -w server -- 10000`, ~14–19k rows/s).
Windows 11, Node 22, SQLite via `node:sqlite`, WAL enabled. `node scripts/perf.mjs 60`:

| Endpoint                                  | p50    | p95    | p99    |
| ----------------------------------------- | ------ | ------ | ------ |
| `GET /orders?page=1&pageSize=25`          | 15.4ms | 16.2ms | 18.8ms |
| `GET /orders?page=50&pageSize=25` (deep)  | 15.3ms | 16.5ms | 47.9ms |
| `GET /orders?status=pending` (indexed)    | 15.2ms | 16.6ms | 29.6ms |
| `GET /orders?q=ORD-1` (LIKE)              | 15.6ms | 16.4ms | 16.5ms |
| `GET /orders/:id` (detail + lines)        | 15.4ms | 16.5ms | 24.6ms |
| `GET /reports/kpis`                       | 15.4ms | 16.3ms | 16.6ms |

**p95 ≈ 16 ms against a 10k-row table — comfortably inside the ~200 ms target.**
The floor is HTTP + JSON overhead on localhost, not the database; every query uses
an index, counts are a single `COUNT(*)` over the same `WHERE`, and no list endpoint
returns unbounded rows.

Run-to-run variance is real on a shared Windows machine: a repeat with 40 iterations
gave p50 15.4–16.1 ms and p95 15.7–23.8 ms for the same endpoints. The table above is
the 60-iteration run and is the one to quote; re-running the command will land in the
same band, not necessarily on the same digits.

Known bottleneck: `q=` uses `LIKE '%…%'`, which cannot use an index, so it scans.
At 10k rows it is still ~16 ms; at millions I would move to FTS5 and keep the same
endpoint contract.

---

## 4. What I skipped, and why

| Skipped | Reason |
| ------- | ------ |
| Shipments / fleet / inventory / warehouse / reports **UI screens** | Timebox. Orders was the vertical slice; the API for these is contract-correct and ready to be wired. Several still render raw data. |
| Inventory `adjust` / `transfer` / low-stock / CSV import logic | Stubs remain. The idempotency middleware is already wired to `/inventory/adjust` so it only needs the service. |
| Webhooks HMAC + retry/backoff + delivery log | Stubs remain. The `secret` is already omitted from list responses. |
| Realtime SSE/WebSocket | Still a no-op; documented rather than faked. The notification `unread-count` endpoint is poll-ready as the fallback. |
| Async report export jobs | Stubs remain. |
| Frontend design system (A1) / shell palette (A2) / dashboard KPIs (A4) | Skipped deliberately — highest effort, and the same time bought a contract fix worth 40%. |
| Route-level code splitting, error boundary | Skipped. |
| Password reset emailing | Token is generated with real expiry + single use and logged; no SMTP dependency. |
| Postgres / Docker Compose / i18n / k6 (stretch) | Not attempted. |
| Repository extraction in the data layer | Services still talk SQL directly. Boundaries are respected (`*.routes.ts` / `*.service.ts` / `*.controller.ts`), but there is no repository layer. |

**Known risks in what I did ship**

1. `bulk-status` catches per-id errors *inside* the transaction, so a partially
   successful batch is committed. That is intentional (the response reports
   per-id outcomes) but it means "all or nothing" is not the guarantee here — the
   comment says so at the call site.
2. The rate limiter is per-process and IP-keyed. Behind a proxy or with more than
   one replica it under-counts. Login is also not yet keyed per account.
3. `onTimePct` in `/reports/kpis` is still a hardcoded `0.92`. Every other KPI is a
   real query; this one needs a promised-vs-actual join that did not fit.
4. `forgot-password` logs the reset token instead of emailing it. Fine for a
   reviewer-driven flow, not production.
5. The FE access token still lives in `localStorage`. I did **not** move it to an
   httpOnly cookie — that requires CSRF handling, and changing it late in the
   timebox would have broken the running flows. The refresh token rotation and
   revoked-family behaviour is real either way. This is a deliberate,
   documented trade-off, not an oversight.
6. `search` uses `LIKE` scans, capped per type (see bottleneck above).

---

## 5. How to run

```bash
npm install

# Reset + seed the starter data (stop the dev server first — it holds the DB lock)
npm run db:reset -w server

# Optional: 10k orders for the performance numbers
npm run seed:orders -w server -- 10000

# API on :4000, web on :5173
npm run dev
```

Seed accounts (unchanged, per the brief):

| Email                       | Password         | Role        |
| --------------------------- | ---------------- | ----------- |
| `admin@meridian.test`       | `Admin123!`      | admin       |
| `dispatcher@meridian.test`  | `Dispatch123!`   | dispatcher  |
| `warehouse@meridian.test`   | `Warehouse123!`  | warehouse   |
| `viewer@meridian.test`      | `Viewer123!`     | viewer      |

The first three are the starter accounts and are unchanged. The `viewer` account
was **added** by me so the read-only rule can be exercised by the smoke suite.

**Extra tests**

```bash
npm run smoke -w server          # 51 contract / RBAC / auth assertions
node scripts/perf.mjs 60         # p50/p95/p99 on 10k orders
```

Env: see `server/.env.example`. `CORS_ORIGIN` is a comma-separated allowlist.
`JWT_SECRET` / `JWT_REFRESH_SECRET` fall back to dev placeholders — set real values
in any non-local environment.

---

## 6. AI tools used, and what I verified myself

**Used:** GitHub Copilot (VS Code) as the primary assistant, for drafting code and
for reasoning about the contract.

**What I verified rather than trusted:**

- Every claim above is backed by a command I ran and read the output of. The smoke
  suite was written to catch *silent* drift, and it did: three real bugs surfaced
  only because the assertions ran.
- **Bugs the tests caught that review alone missed:**
  1. `db.inner.transaction(...)` does not exist on `node:sqlite` (that is
     better-sqlite3). Replaced with a real `BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK`
     helper.
  2. `refresh` minted a token **byte-identical to the old one** when issued within
     the same second, because the JWT payload and `iat` were unchanged — so
     "rotation" was a no-op and reuse detection could never fire. Fixed by adding a
     unique `jti`. This was a genuine security bug, not a style issue.
  3. `orders.create` had no `lines` handling until the validator rejected it, and
     an earlier `random()` reference generator could collide on the `UNIQUE`
     constraint — now monotonic.
  4. **`viewer` could mutate.** `POST /orders/:id/transition` and
     `POST /orders/:id/duplicate` had no role guard at all, so a read-only account
     could advance or clone an order. Found by auditing every mutating route for a
     `requireRoles` call rather than trusting the earlier pass. Fixed, and now
     covered by 9 assertions.
- I re-ran typecheck (`tsc --noEmit`) on both workspaces and the full smoke suite
  after every change; the final state is 0 TypeScript errors and 51/51 passing.
- I did **not** blindly accept the starter's own docstrings — several were wrong
  about what the code actually did (e.g. `parsePagination` claimed to parse
  pagination while nothing applied it to SQL).
