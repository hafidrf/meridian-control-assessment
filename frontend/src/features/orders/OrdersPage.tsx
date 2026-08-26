import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ordersApi } from "../../api/orders";
import { useResource } from "../../hooks/useResource";
import { EmptyState, ErrorBanner, PageHeader, StatusBadge } from "../../components/common/Ui";

type ListShape = { data?: unknown[]; items?: unknown[]; total?: number };

export function OrdersPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { data, error, loading } = useResource(() => ordersApi.list(1, 25, status || undefined), [status]);

  const rows = useMemo(() => {
    const payload = data as ListShape | null;
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    return payload.items ?? payload.data ?? [];
  }, [data]);

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
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="pending">pending</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="picking">picking</option>
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
            {(rows as Record<string, unknown>[]).map((row) => {
              const id = String(row.id ?? "");
              const ref = String(row.reference ?? row.ref ?? id);
              return (
                <tr key={id}>
                  <td><Link to={`/orders/${id}`}>{ref}</Link></td>
                  <td><StatusBadge value={String(row.status ?? "")} /></td>
                  <td>{String(row.priority ?? "")}</td>
                  <td>{String(row.warehouseId ?? row.warehouse_id ?? "")}</td>
                  <td>{String(row.promisedAt ?? row.promised_at ?? "")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && !loading ? <EmptyState title="No orders" hint="Create an order or fix the list contract." /> : null}
      </div>
    </div>
  );
}
