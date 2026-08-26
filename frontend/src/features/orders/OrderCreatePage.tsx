import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ordersApi } from "../../api/orders";
import { ErrorBanner, PageHeader } from "../../components/common/Ui";

export function OrderCreatePage() {
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await ordersApi.create({
        customerId,
        warehouseId,
        lines: [{ productId, qty }],
      });
      nav(`/orders/${(created as { id?: string }).id ?? ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card card-pad stack" style={{ maxWidth: 720 }}>
      <PageHeader title="New order" />
      <ErrorBanner message={error} />
      <div className="form-grid">
        <label className="field">Customer ID<input className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} /></label>
        <label className="field">Warehouse ID<input className="input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} /></label>
        <label className="field">Product ID<input className="input" value={productId} onChange={(e) => setProductId(e.target.value)} /></label>
        <label className="field">Qty<input className="input" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></label>
      </div>
      <button className="btn primary" type="submit">Create</button>
    </form>
  );
}
