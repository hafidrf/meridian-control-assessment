import { warehousesApi, customersApi, fleetApi, usersApi, notificationsApi, auditApi } from "../../api/resources";
import { useResource } from "../../hooks/useResource";
import { ErrorBanner, PageHeader } from "../../components/common/Ui";

function JsonTable({ title, loader }: { title: string; loader: () => Promise<unknown> }) {
  const { data, error, loading } = useResource(loader, []);
  return (
    <div>
      <PageHeader title={title} />
      {loading ? <p className="muted">Loading…</p> : null}
      <ErrorBanner message={error} />
      <pre className="card card-pad" style={{ overflow: "auto", fontSize: 12 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export const WarehousesPage = () => <JsonTable title="Warehouses" loader={warehousesApi.list} />;
export const CustomersPage = () => <JsonTable title="Customers" loader={() => customersApi.list()} />;
export const FleetPage = () => (
  <div className="stack">
    <JsonTable title="Vehicles" loader={fleetApi.vehicles} />
    <JsonTable title="Drivers" loader={fleetApi.drivers} />
  </div>
);
export const UsersPage = () => <JsonTable title="Users" loader={usersApi.list} />;
export const NotificationsPage = () => <JsonTable title="Notifications" loader={notificationsApi.list} />;
export const AuditPage = () => <JsonTable title="Audit log" loader={auditApi.list} />;
export const ReportsPage = () => (
  <p className="muted">Build SLA, throughput, inventory value, and driver utilization views. Wire filters to the reports API.</p>
);
export const SettingsPage = () => (
  <div className="card card-pad stack">
    <h2 style={{ margin: 0 }}>Settings</h2>
    <p className="muted">Webhook endpoints, notification preferences, API tokens, and warehouse defaults belong here.</p>
  </div>
);
