import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ordersApi } from "../../api/orders";
import { useDebounce } from "../../hooks/useDebounce";
import { useResource } from "../../hooks/useResource";
import type { Order, OrderStatus } from "../../types";
import { EmptyState, ErrorBanner, PageHeader, StatusBadge } from "../../components/common/Ui";

const STATUS_OPTIONS: OrderStatus[] = ["pending", "picking", "packed", "shipped", "delivered", "cancelled"];
const PAGE_SIZE = 25;

export function OrdersPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q, 300);
  const { data, error, loading } = useResource(
    () => ordersApi.list(page, PAGE_SIZE, status || undefined, debouncedQ || undefined),
    [page, status, debouncedQ],
  );

  // New filter/search resets to page 1 so we never query an empty window.
  useEffect(() => {
    setPage(1);
  }, [status, debouncedQ]);

  const rows: Order[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Orders"
        actions={
          <>
            <Link className="btn primary" to="/orders/new">New order</Link>
            <button className="btn" type="button" onClick={() => void ordersApi.exportCsv()}>Export</button>
          </>
        }
      />
      <div className="toolbar">
        <input className="input" placeholder="Search reference" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      {loading ? <p className="muted">Loading…</p> : null}
      <ErrorBanner message={error} />
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Warehouse</th>
              <th>Promised</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link to={`/orders/${row.id}`}>{row.reference}</Link></td>
                <td><StatusBadge value={row.status} /></td>
                <td>{row.priority}</td>
                <td>{row.warehouseId}</td>
                <td>{row.promisedAt ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading ? <EmptyState title="No orders" hint="No orders match the current filters." /> : null}
      </div>
      <div className="toolbar" role="navigation" aria-label="Orders pagination">
        <button className="btn" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span className="muted">Page {page} of {totalPages} · {total} orders</span>
        <button className="btn" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
