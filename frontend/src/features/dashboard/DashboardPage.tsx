import { reportsApi } from "../../api/resources";
import { useResource } from "../../hooks/useResource";
import { ErrorBanner, EmptyState } from "../../components/common/Ui";
import type { KpiPayload } from "../../types";

export function DashboardPage() {
  const { data, error, loading } = useResource(() => reportsApi.kpis(), []);

  if (loading) return <p className="muted">Loading dashboard…</p>;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return <EmptyState title="No KPI data" />;

  const kpis: { label: string; value: string }[] = [
    { label: "Open orders", value: String(data.openOrders ?? "—") },
    { label: "Active shipments", value: String(data.activeShipments ?? "—") },
    { label: "Low stock SKUs", value: String(data.lowStockSkus ?? "—") },
    { label: "On-time %", value: data.onTimePct != null ? `${Math.round(Number(data.onTimePct) * 100)}%` : "—" },
  ];

  return (
    <div>
      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="card card-pad kpi" key={k.label}>
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
          </div>
        ))}
      </div>
      <div className="card card-pad">
        <p className="muted">
          Generated at: {String((data as KpiPayload).generatedAt ?? "unknown")} — unify timestamp format with the API.
        </p>
        <p className="muted">Replace this panel with charts, exception queues, and live shipment exceptions.</p>
      </div>
    </div>
  );
}
