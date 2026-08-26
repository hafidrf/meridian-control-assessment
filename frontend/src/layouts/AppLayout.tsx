import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/orders", label: "Orders" },
  { to: "/shipments", label: "Shipments" },
  { to: "/inventory", label: "Inventory" },
  { to: "/warehouses", label: "Warehouses" },
  { to: "/fleet", label: "Fleet" },
  { to: "/customers", label: "Customers" },
  { to: "/reports", label: "Reports" },
  { to: "/users", label: "Users" },
  { to: "/notifications", label: "Notifications" },
  { to: "/audit", label: "Audit" },
  { to: "/settings", label: "Settings" },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>MERIDIAN</strong>
          <span>Control tower</span>
        </div>
        <nav className="nav-group">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: 10 }} className="muted">
          <div>{user?.name}</div>
          <div>{user?.role}</div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <h1>Operations</h1>
          <div className="topbar-meta">
            <span>{user?.email}</span>
            <button className="btn" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
