import { useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { authApi } from "../services/api";

const ROLE_COLOR = {
  admin:    "text-violet-400 bg-violet-400/10",
  operator: "text-blue-400 bg-blue-400/10",
  viewer:   "text-slate-400 bg-slate-400/10",
};

const NAV = [
  {
    id: "dashboard", label: "Dashboard",
    roles: ["admin","operator","viewer"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    id: "analytics", label: "Analytics",
    roles: ["admin","operator","viewer"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: "devices", label: "Devices",
    roles: ["admin","operator","viewer"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    id: "alerts", label: "Alerts",
    roles: ["admin","operator","viewer"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    id: "house", label: "House",
    roles: ["admin"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    ),
  },
  {
    id: "users", label: "Members",
    roles: ["admin"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export default function Sidebar({ page, setPage }) {
  const { user, house, role, clearAuth } = useAuthStore();
  const [collapsed, setCollapsed]         = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const visibleNav = NAV.filter((n) => !role || n.roles.includes(role));

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    clearAuth();
  }

  return (
    <>
      <aside
        style={{ width: collapsed ? 64 : 220, transition: "width 250ms ease" }}
        className="relative flex flex-col h-screen bg-gray-900 border-r border-gray-800 shrink-0"
      >
        <div className="flex flex-col h-full overflow-hidden">
        {/* ── Brand ── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M1.5 8.5a13 13 0 0 1 21 0M5 12a9 9 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/>
              <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">TelemetryX</p>
              {house?.houseName && <p className="text-gray-500 text-xs leading-tight truncate">{house.houseName}</p>}
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((n) => {
            const active = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                title={collapsed ? n.label : undefined}
                className={`
                  w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${active
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"}
                `}
              >
                <span className="shrink-0">{n.icon}</span>
                {!collapsed && <span className="whitespace-nowrap">{n.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* ── House badge ── */}
        {!collapsed && house?.houseNumber && (
          <div className="mx-3 mb-3 p-2.5 rounded-lg bg-gray-800 border border-gray-700">
            <p className="text-gray-500 text-xs mb-0.5">House</p>
            <p className="text-white text-sm font-semibold">{house.houseNumber}</p>
          </div>
        )}

        {/* ── User section ── */}
        <div className="border-t border-gray-800 px-2 py-3 space-y-1">
          <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
            <div className="shrink-0 w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-xs text-white font-semibold uppercase">
              {user?.name?.[0] ?? "?"}
            </div>
            {!collapsed && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user?.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLOR[role] ?? ROLE_COLOR.viewer}`}>
                  {role}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setLogoutConfirm(true)}
            title={collapsed ? "Logout" : undefined}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        </div>

        {/* ── Collapse toggle ── */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute top-4 -right-3 w-6 h-6 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
            {collapsed
              ? <polyline points="9 18 15 12 9 6"/>
              : <polyline points="15 18 9 12 15 6"/>}
          </svg>
        </button>
      </aside>

      {/* ── Logout confirmation dialog ── */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-white font-semibold text-lg mb-2">Sign out?</h3>
            <p className="text-gray-400 text-sm mb-5">You'll need to sign in again to access your dashboard.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
