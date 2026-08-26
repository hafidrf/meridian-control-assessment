import { inventoryApi } from "../../api/resources";
import { useResource } from "../../hooks/useResource";
import { EmptyState, ErrorBanner, PageHeader } from "../../components/common/Ui";

export function InventoryPage() {
  const { data, error, loading } = useResource(() => inventoryApi.levels(), []);
  const payload = data as { data?: unknown[] } | unknown[] | null;
  const rows = Array.isArray(payload) ? payload : payload?.data ?? [];

  return (
    <div>
      <PageHeader title="Inventory" actions={<button className="btn" type="button">Adjust</button>} />
      {loading ? <p className="muted">Loading…</p> : null}
      <ErrorBanner message={error} />
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr><th>SKU</th><th>Warehouse</th><th>On hand</th><th>Reserved</th><th>Reorder</th></tr>
          </thead>
          <tbody>
            {(rows as Record<string, unknown>[]).map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.sku ?? "")}</td>
                <td>{String(row.warehouse_code ?? row.warehouse ?? "")}</td>
                <td>{String(row.on_hand ?? row.onHand ?? "")}</td>
                <td>{String(row.reserved ?? "")}</td>
                <td>{String(row.reorder_point ?? row.reorderPoint ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading ? <EmptyState title="No inventory rows" /> : null}
      </div>
    </div>
  );
}
