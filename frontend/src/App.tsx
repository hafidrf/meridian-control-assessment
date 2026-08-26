import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { OrdersPage } from "./features/orders/OrdersPage";
import { OrderCreatePage } from "./features/orders/OrderCreatePage";
import { OrderDetailPage } from "./features/orders/OrderDetailPage";
import { ShipmentsPage, ShipmentDetailPage } from "./features/shipments/ShipmentsPage";
import { InventoryPage } from "./features/inventory/InventoryPage";
import {
  AuditPage,
  CustomersPage,
  FleetPage,
  NotificationsPage,
  ReportsPage,
  SettingsPage,
  UsersPage,
  WarehousesPage,
} from "./features/lists/ListPages";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted" style={{ padding: 24 }}>Restoring session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<OrderCreatePage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="shipments" element={<ShipmentsPage />} />
        <Route path="shipments/:id" element={<ShipmentDetailPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="warehouses" element={<WarehousesPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
