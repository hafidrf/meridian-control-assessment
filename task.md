# Meridian Control — Coding Test

**Product:** internal control-tower for a fictional 3PL (warehouses, inventory, orders, last-mile shipments, fleet).
**You may use any tools**, including AI assistants, Copilot, ChatGPT, Cursor, docs, and Stack Overflow.
**You will not finish this backlog.** That is intentional. We grade judgment, structure, and the quality of what you ship — not a checkbox count.

Timebox is set by the interviewer (typically 3–6 hours). Stop with a working slice, a short `NOTES.md`, and git history that a reviewer can follow.

---

## 1. What we are measuring

| Weight | Area | What “good” looks like |
| --- | --- | --- |
| **30%** | Frontend UI | Coherent layout, real workflows (not JSON dumps), loading/empty/error/permission states, accessible forms, consistent design language, sensible file structure under `frontend/src/features`. |
| **30%** | Backend functionality | Correct domain behavior, transactions where needed, validation, RBAC, persistence, testable services, module boundaries respected. |
| **40%** | Compatibility, speed, safety | Frontend and backend share **one** contract. Pagination, errors, enums, dates, and envelopes match. Auth is actually enforced. Lists are fast under load. Secrets, uploads, and injections are handled. No silent data loss. |

Style and structure are scored inside all three buckets. Copy-pasted AI output that ignores this repo’s patterns scores poorly even if it “works”.

---

## 2. Rules

1. Keep the **module / feature folder** layout. Do not collapse the API into a single `server.js` or the UI into one `App.tsx`.
2. Do **not** assume the starter contracts are correct. Align them. Document the chosen contract (OpenAPI, shared types, or both).
3. Prefer finishing a **vertical slice** (UI + API + persistence + authz + error handling) over touching every file shallowly.
4. Seed accounts must keep working unless you document a replacement.
5. Add `NOTES.md` at the repo root: what you completed, what you skipped, known risks, how to run extra tests, which AI tools you used and what you still verified yourself.
6. Do not commit secrets. Rotate `JWT_SECRET` away from the placeholder if you add env-based config, but keep `.env.example` accurate.
7. Automated tests are not required for every function, but any claim about correctness or performance should be demonstrable (`curl`, a script, or tests).

---

## 3. Starter kit — known issues (fix these as you go)

The app boots and login works. Almost everything else is a stub or a trap.

### Contract drift (compatibility)

Treat these as bugs, not documentation:

| Topic | Backend today | Frontend today |
| --- | --- | --- |
| Error body | `{ error: { code, message, details } }` | Reads `err.message` at the top level. Rate limiter returns `{ message }`. |
| List envelopes | Mix of raw arrays, `{ data }`, `{ items }`, `{ results }`, `{ shipments }`, `{ drivers }`, `{ logs }` | Assumes `{ data }` or `{ items }` depending on the client file |
| Pagination | `page` / `pageSize` / `offset` / `limit` / `cursor` all parsed, **none applied** to SQL | Sends `page` + `pageSize` |
| Order status | `pending \| picking \| packed \| shipped \| delivered \| cancelled` | `PENDING \| IN_PROGRESS \| COMPLETE \| CANCELLED` |
| User role | lowercase `admin`, `dispatcher`, … | uppercase `ADMIN`, … |
| Field names | snake_case in many SQL rows (`warehouse_id`, `on_hand`) | camelCase types (`warehouseId`, `onHand`) |
| Order identity | `reference` | type field `ref` |
| KPI clock | `generatedAt` is a unix **number** | type says **string** |
| Inventory qty | integers | type says **string** |
| Auth refresh | stores raw refresh JWT, `refresh` / `logout` are 501 | client has calls, no interceptor, no 401 retry |

### Safety / performance gaps (compatibility bucket)

- `requireRoles(...)` does not check roles.
- SQLite `foreign_keys = OFF`. Schema has almost no indexes and no unique `(warehouse_id, product_id)` on inventory.
- `LIKE %q%` search with string concatenation; no query timeout; unbounded `SELECT *`.
- Rate limit is in-memory, IP-only, login-only, inconsistent error shape.
- Audit writer is synchronous on the response path.
- File upload accepts any MIME up to 25MB with no virus/type policy and never records the row.
- Refresh tokens are not hashed at rest.
- CORS origin is a single string; no helmet / CSP / body-size story beyond 2mb JSON.
- Webhooks have a placeholder secret and no signature scheme.
- Realtime module is a no-op.
- Async route handlers are not uniformly wrapped (`asyncHandler` exists only on auth). Unhandled promise rejections will occur on stub endpoints.
- Route order bugs: `GET /api/shipments/track/:trackingNo` is registered **after** `GET /:id`; `GET /api/audit/export` is after `/:id`.

Use these as a punch list, then go deeper.

---

## 4. Scoring rubric (reviewer)

Each area is 0–5, then weighted.

### Frontend UI (30%)

- **5** Production-quality flows: list/detail/create/edit, filters, pagination controls, toasts, empty/error/forbidden, keyboard-usable, no layout collapse, design tokens used consistently.
- **3** Several screens work; some still dump JSON; visual language is uneven.
- **1** Login + one table; rest untouched or visually broken.
- **0** App does not run or UI is unrelated to this product.

### Backend functionality (30%)

- **5** Core domains persist correctly with invariants (inventory reservation, order transitions, RBAC). Services are testable. Invalid states are rejected.
- **3** CRUD works for 1–2 domains; transitions/inventory are naive but honest.
- **1** Stubs replaced with in-memory fakes that reset on restart, or giant unstructured handlers.
- **0** API does not run, or mutations corrupt data silently.

### Compatibility / speed / safety (40%)

- **5** One documented contract; FE and BE types match; pagination + indexes; authz on every mutating route; validated uploads; hashed refresh tokens; no XSS sink; p95 list under ~200ms on 10k seed rows (or you show the measurement and bottleneck).
- **3** Contract mostly unified; some endpoints still special; basic authz and pagination exist.
- **1** UI only works with ad-hoc `as any` parsing; N+1 or full-table scans left in the hot path; roles still a no-op.
- **0** Tokens in query strings, passwords logged, SQL built from unsanitized strings, or FE/BE cannot talk without the browser console hacks.

Reviewers should skim `NOTES.md` and git diffs for: naming consistency, dead code, duplicated types, and whether AI output was integrated or dumped.

---

## 5. Backlog

Work top-down inside a stream if you can. **Must-attempt** items are marked ★. Everything else is fair game for extra signal.

### A. Frontend UI (30%)

#### A1. Design system ★
- Replace one-off styles with a small tokenized system (you may keep CSS or introduce a library).
- Shared `Button`, `Input`, `Select`, `Modal`, `Drawer`, `Toast`, `Spinner`, `Pagination`, `DataTable`, `ConfirmDialog`.
- Dark-capable or high-contrast mode is optional; contrast must pass for the default theme.

#### A2. Shell ★
- Responsive sidebar (mobile nav).
- Global search palette (`/` or `Ctrl+K`) calling `GET /api/search`.
- Notification bell with unread count and mark-read.
- Session expiry UX (banner + re-login, no silent data loss on a form).

#### A3. Auth screens
- Login error states that show the **API error code + message**.
- Forgot / reset password screens wired to existing routes.
- Change password from settings.

#### A4. Dashboard ★
- KPI cards that match the unified KPI contract (including ISO timestamps).
- Orders-by-status chart.
- Exception queue: late orders, low stock, shipment exceptions.
- Time range filter (`today`, `7d`, `30d`) hitting reports endpoints — no fake numbers.

#### A5. Orders ★
- Filterable, sortable, **paginated** table (status, warehouse, customer, date, priority).
- Debounced search (hook already exists; use it).
- Create / edit with line items, stock warnings, client-side + server-side validation errors mapped to fields.
- Detail: timeline of transitions, allocate, duplicate, cancel with confirm.
- Bulk status change with a progress/result summary.
- CSV export download (not `apiGet` into JSON).
- Optimistic UI **only** if you can roll back on 409/version conflict.

#### A6. Shipments
- Kanban or table by status.
- Detail timeline from `shipment_events`.
- Assign driver/vehicle from live availability.
- Tracking page by tracking number (public-or-auth — pick one and document).
- Proof-of-delivery upload + image preview.
- Map placeholder using lat/lng from events (no paid API required).

#### A7. Inventory
- Levels grid with warehouse filter.
- Adjust / reserve / release / transfer modals with `version` (optimistic concurrency).
- Low-stock view.
- Product create/edit including hazmat flag.
- CSV import with row-level error report.

#### A8. Warehouses, customers, fleet, users
- Proper tables instead of `<pre>`.
- Create/edit drawers.
- Customer order history.
- Driver ↔ vehicle assignment with conflict errors.
- User invite + deactivate + role change (admin only).

#### A9. Reports
- SLA, throughput, inventory value, driver utilization with query params for warehouse and date range.
- Loading skeletons; empty states; CSV/async export job UI.

#### A10. Settings / admin
- Webhook manager (create, rotate secret, test delivery, delivery log).
- Audit log viewer with filters (actor, resource, date) — admin only.
- Feature flags stub is acceptable if documented.

#### A11. Quality
- Route-level code splitting.
- Error boundary.
- Abort in-flight requests on unmount / filter change.
- No `any` without a comment.
- Accessibility: labels, focus trap in modals, table headers, not-color-only status.

---

### B. Backend functionality (30%)

#### B1. Auth ★
- Implement `refresh` (rotate refresh tokens, hash at rest, reject reuse).
- Implement `logout` (revoke).
- Implement `register` (admin-only or invite-only — document).
- Forgot/reset password (in-memory token is OK if expiry and single-use are real).
- Change password with current-password check.
- Lock inactive users out of existing tokens.

#### B2. RBAC ★
- Make `requireRoles` real.
- Resource-level rules: warehouse users only see their warehouse; drivers only their shipments; viewers are read-only.
- Return 403 (not 404) when the resource exists but is forbidden — unless you document anti-enumeration and apply it consistently.

#### B3. Orders ★
- `create`: generate monotonic `reference`, persist lines, default status `pending`.
- `update` only in editable statuses.
- `transition`: allowed graph only (`pending→picking→packed→shipped→delivered`, plus `cancelled` from pre-ship).
- `allocateInventory`: reserve stock, increment `reserved`, bump `version`, fail with 409 on shortage.
- `duplicate`, `remove` (or cancel-only), `bulkStatus` in a transaction.
- `exportCsv` streaming, not loading all rows into a string if the table is large.

#### B4. Inventory ★
- Unique `(warehouse_id, product_id)`.
- `adjust` / `reserve` / `release` / `transfer` with row-level version checks.
- Never allow `on_hand < 0` or `reserved > on_hand`.
- `lowStock`, CSV import (transaction per file or savepoints), export.

#### B5. Shipments
- Create from a packed/shipped order; unique `tracking_no`.
- Assign driver/vehicle only if both `available` / `on_shift`.
- Append-only events; status derived from last event or kept in sync — pick one.
- POD stores a `file_assets` row and links it.
- ETA helper can be a documented heuristic (distance stub is fine).

#### B6. Fleet / warehouses / customers / users
- Full CRUD with validation.
- `fleet/availability` returns free vehicles and idle drivers for a timestamp.
- Warehouse capacity vs current inventory units.
- Soft-delete / archive, not hard delete of referenced rows.

#### B7. Notifications & audit
- Create notifications on order created, stockout, shipment exception.
- Mark read / read-all scoped to current user.
- Audit: structured `action`, `resource`, `resource_id`; do not log passwords or tokens.
- Fix route order for export.

#### B8. Webhooks
- HMAC signature (`X-Meridian-Signature` or similar).
- Retry with backoff; delivery log table.
- Test endpoint sends a signed ping.
- Secret shown once at creation.

#### B9. Uploads
- Allowlist MIME + extension; size cap by type.
- Store metadata in `file_assets`.
- Signed download URL or authenticated stream.
- Delete removes disk + row.

#### B10. Search & realtime
- `GET /api/search?q=` across orders, shipments, customers, SKUs with a cap and type facets.
- SSE or WebSocket for shipment events and notification counts. Fallback to polling if you must, but document why.

#### B11. Reports
- Implement throughput, SLA, inventory value, driver utilization with SQL aggregations (not JS over full tables).
- Async export: `POST /reports/export` → job id → poll/download.

#### B12. Data layer
- Turn `foreign_keys` on; add FKs and indexes (`orders.customer_id`, `orders.status`, `shipments.tracking_no`, `inventory_items(warehouse_id,product_id)`, `audit_logs.created_at`).
- Seed script that can generate **N** orders (10k+) for perf work.
- Optional: extract repositories so services do not talk SQL directly.

---

### C. Compatibility, speed, safety (40%)

#### C1. One contract ★
- Publish `openapi.yaml` **or** a `packages/shared` (or `shared/`) TypeScript types package used by both apps.
- Single error envelope: `{ error: { code, message, details? } }` and HTTP status mapping table in `NOTES.md`.
- Single list envelope: e.g. `{ data, page, pageSize, total, sort, order }`.
- Enums identical; dates ISO-8601 UTC; money integers (minor units) with currency documented; booleans as booleans.
- Pagination applied in SQL (`LIMIT/OFFSET` or keyset). Keyset preferred for the hottest list.

#### C2. Client reliability ★
- Parse the unified error envelope (today login failures show “Request failed”).
- Access token refresh interceptor; queue in-flight 401s; logout on refresh failure.
- Idempotency-Key header on `POST /orders` and `/inventory/adjust` (backend stores and replays).
- Request timeouts and abort.

#### C3. Performance ★
- Index the filters you actually use.
- Eliminate N+1 on order detail (join or batched lines).
- List endpoints must not return unbounded rows.
- Debounce + min query length for search.
- Measure: seed 10k orders, report p50/p95 for `GET /api/orders` and the orders page load. Put numbers in `NOTES.md`.
- Optional: ETag / `If-None-Match` on KPI and list endpoints; HTTP cache headers where safe.

#### C4. Safety ★
- Hash refresh tokens (and password reset tokens).
- Parameterized queries only; quote identifiers if you add sort columns from query params (sort allowlist).
- RBAC on every mutating route; IDOR tests (user A cannot allocate user B’s warehouse stock if policy forbids it).
- Helmet (or equivalent headers), strict CORS, no `*` with credentials.
- Upload allowlist; do not serve user files with executable MIME.
- XSS: never `dangerouslySetInnerHTML` on API strings; CSP if you add helmet.
- Rate limit login and search (per account after bind, not only IP); consistent 429 body.
- Do not put JWT in localStorage without discussing XSS; httpOnly cookie is a plus if CSRF is also handled. Document the choice.
- Secrets never returned on `GET /webhooks` (you already omit `secret` — keep it that way).

#### C5. Operability
- Structured request logs with `x-request-id` on FE and BE.
- Health/ready used honestly; metrics that a reviewer can scrape.
- Graceful shutdown.
- Wrap all async handlers so 501s become JSON, not crashes.

---

### D. Stretch (extra signal, not expected)

- Multi-warehouse transfer orders with two-phase reserve.
- Slotting / pick-path suggestion (heuristic).
- Recurring orders.
- Tax/landed-cost calculation.
- i18n.
- Playwright e2e for login → create order → allocate → ship.
- k6 or autocannon script checked into `scripts/`.
- Docker Compose for API + web + optional Redis rate limiter.
- Replace SQLite with Postgres behind a repository (keep SQLite as default for reviewers).

---

## 6. Suggested attack plan (not mandatory)

If time is short, this order maximizes score:

1. Unify error + list + enum contracts; fix the API client and types. (C, 40%)
2. Real RBAC + refresh tokens. (B + C)
3. Orders create/list/detail + pagination + indexes. (A + B + C)
4. Inventory adjust with version + allocate-on-order. (B + C)
5. Rebuild orders/inventory/dashboard UI so humans can use them. (A)
6. Shipments timeline + one realtime or polling path. (A + B)
7. Measure list performance; write numbers down. (C)
8. Anything else you still have energy for.

---

## 7. Deliverables

- Running `npm run dev` (or documented alternative).
- `NOTES.md` (required).
- Optional: `openapi.yaml`, `scripts/perf.sh`, tests under `server/` and `frontend/`.
- Do not delete `task.md`.

---

## 8. Seed data

| Email | Password | Role |
| --- | --- | --- |
| admin@meridian.test | Admin123! | admin |
| dispatcher@meridian.test | Dispatch123! | dispatcher |
| warehouse@meridian.test | Warehouse123! | warehouse |

API: `http://localhost:4000` · Web: `http://localhost:5173`

---

Good luck. Ship a coherent system, not a pile of generated files.
