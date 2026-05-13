import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import RoleGuard from "./components/RoleGuard";
import Dashboard from "./pages/Dashboard";
import AlertsPage from "./pages/AlertsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DeviceManagementPage from "./pages/DeviceManagementPage";
import HousePage from "./pages/HousePage";
import UsersPage from "./pages/UsersPage";
import LoginPage from "./pages/LoginPage";
import { useSocket } from "./hooks/useSocket";
import useStore from "./store/useStore";
import useAuthStore from "./store/useAuthStore";
import { fetchDevices, fetchAlerts, authApi } from "./services/api";

const PAGE_KEY = "telemetryx-page";

export default function App() {
  const [page, setPage] = useState(() => {
    try { return localStorage.getItem(PAGE_KEY) || "dashboard"; } catch { return "dashboard"; }
  });

  const { setDevices, setAlerts } = useStore();
  const { user, accessToken, role, setAuth, clearAuth } = useAuthStore();


  useEffect(() => {
    if (!accessToken) {
      authApi.refresh()
        .then((res) => setAuth(res.user, res.accessToken, res.house, res.role, res.memberships))
        .catch(() => {});
    }
  }, []);

  useSocket();

  useEffect(() => {
    if (!user) return;
    fetchDevices().then(setDevices).catch(console.error);
    fetchAlerts().then(setAlerts).catch(console.error);
  }, [user]);

  if (!user) return <LoginPage />;

  function handleSetPage(p) {
    setPage(p);
    try { localStorage.setItem(PAGE_KEY, p); } catch {}
  }


  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar page={page} setPage={handleSetPage} />

      <main className="flex-1 overflow-y-auto">
        {page === "dashboard"  && <Dashboard />}
        {page === "alerts"     && <AlertsPage />}
        {page === "analytics"  && (
          <RoleGuard roles={["admin","operator","viewer"]}>
            <AnalyticsPage />
          </RoleGuard>
        )}
        {page === "devices"    && (
          <RoleGuard roles={["admin","operator","viewer"]}>
            <DeviceManagementPage />
          </RoleGuard>
        )}
        {page === "house"      && (
          <RoleGuard roles={["admin"]}>
            <HousePage />
          </RoleGuard>
        )}
        {page === "users"      && (
          <RoleGuard roles={["admin"]}>
            <UsersPage />
          </RoleGuard>
        )}
      </main>
    </div>
  );
}
  
