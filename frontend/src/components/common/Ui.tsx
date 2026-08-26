import type { ReactNode } from "react";

export function StatusBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  const kind = v.includes("deliver") || v.includes("ok") || v.includes("complete")
    ? "ok"
    : v.includes("cancel") || v.includes("exception") || v.includes("stock")
      ? "bad"
      : v.includes("high") || v.includes("pending") || v.includes("pick")
        ? "warn"
        : "";
  return <span className={`badge ${kind}`}>{value}</span>;
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="error">{message}</p>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint ? <p className="muted">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="toolbar" style={{ justifyContent: "space-between" }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      <div className="toolbar" style={{ margin: 0 }}>{actions}</div>
    </div>
  );
}
