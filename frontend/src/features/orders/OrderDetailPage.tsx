import { useParams } from "react-router-dom";
import { ordersApi } from "../../api/orders";
import { useResource } from "../../hooks/useResource";
import { ErrorBanner, PageHeader, StatusBadge } from "../../components/common/Ui";

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const { data, error, loading } = useResource(() => ordersApi.get(id), [id]);
  const row = data as Record<string, unknown> | null;

  if (loading) return <p className="muted">Loading order…</p>;
  if (error) return <ErrorBanner message={error} />;
  if (!row) return null;

  const lines = (row.lines as Record<string, unknown>[] | undefined) ?? [];

  return (
    <div className="stack">
      <PageHeader
        title={String(row.reference ?? row.ref ?? id)}
        actions={
          <>
            <button className="btn" type="button" onClick={() => void ordersApi.transition(id, "picking")}>Start pick</button>
            <button className="btn" type="button" onClick={() => void ordersApi.allocate(id)}>Allocate</button>
            <button className="btn" type="button" onClick={() => void ordersApi.duplicate(id)}>Duplicate</button>
          </>
        }
      />
      <div className="card card-pad">
        <p><StatusBadge value={String(row.status)} /> · priority {String(row.priority)}</p>
        <p className="muted">Customer {String(row.customerId ?? row.customer_id)} · Warehouse {String(row.warehouseId ?? row.warehouse_id)}</p>
        <p className="muted">{String(row.notes ?? "")}</p>
      </div>
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr><th>Line</th><th>Product</th><th>Qty</th><th>Picked</th></tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={String(line.id)}>
                <td>{String(line.id)}</td>
                <td>{String(line.productId ?? line.product_id)}</td>
                <td>{String(line.qty)}</td>
                <td>{String(line.qtyPicked ?? line.qty_picked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
