import { shipmentsApi } from "../../api/resources";
import { useResource } from "../../hooks/useResource";
import { EmptyState, ErrorBanner, PageHeader, StatusBadge } from "../../components/common/Ui";
import { Link } from "react-router-dom";

export function ShipmentsPage() {
  const { data, error, loading } = useResource(() => shipmentsApi.list(), []);
  const payload = data as { shipments?: unknown[]; data?: unknown[] } | unknown[] | null;
  const rows = Array.isArray(payload) ? payload : payload?.shipments ?? payload?.data ?? [];

  return (
    <div>
      <PageHeader title="Shipments" />
      {loading ? <p className="muted">Loading…</p> : null}
      <ErrorBanner message={error} />
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr><th>Tracking</th><th>Status</th><th>Destination</th><th>ETA</th></tr>
          </thead>
          <tbody>
            {(rows as Record<string, unknown>[]).map((row) => (
              <tr key={String(row.id)}>
                <td><Link to={`/shipments/${String(row.id)}`}>{String(row.tracking_no ?? row.tracking ?? row.id)}</Link></td>
                <td><StatusBadge value={String(row.status)} /></td>
                <td>{String(row.dest_city ?? row.destCity ?? "")}</td>
                <td>{String(row.eta ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading ? <EmptyState title="No shipments" /> : null}
      </div>
    </div>
  );
}

export function ShipmentDetailPage() {
  return <p className="muted">Implement shipment timeline, live map placeholder, POD upload, and driver assignment.</p>;
}
