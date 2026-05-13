import { useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { authApi } from "../services/api";

const ROLE_BADGE = {
  admin:    "bg-purple-500/20 text-purple-400",
  operator: "bg-blue-500/20 text-blue-400",
  viewer:   "bg-gray-500/20 text-gray-400",
};

export default function Header({ page, setPage }) {
  const { user, house, clearAuth } = useAuthStore();
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const nav = [
    { id: "dashboard",  label: "Dashboard",  roles: ["admin","operator","viewer"] },
    { id: "alerts",     label: "Alerts",     roles: ["admin","operator","viewer"] },
    { id: "analytics",  label: "Analytics",  roles: ["admin","operator","viewer"] },
    { id: "devices",    label: "Devices",    roles: ["admin","operator","viewer"] },
    { id: "house",      label: "House",      roles: ["admin"] },
    { id: "users",      label: "Users",      roles: ["admin"] },
  ].filter((n) => !user || n.roles.includes(user.role));

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    clearAuth();
  }

  return (
    <>
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div>
          <h1 className="text-white font-bold text-sm leading-tight">TelemetryX</h1>
          {house?.houseName && (
            <p className="text-gray-400 text-xs leading-tight">{house.houseName}</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="hidden sm:flex gap-1">
        {nav.map((n) => (
          <button key={n.id} onClick={() => setPage(n.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              page === n.id
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}>
            {n.label}
          </button>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Role badge */}
        {user && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline ${ROLE_BADGE[user.role]}`}>
            {user.role}
          </span>
        )}

        {/* Avatar + name */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">
              {user.name?.[0]}
            </div>
            <span className="text-gray-300 text-sm hidden md:block">{user.name}</span>
          </div>
        )}

        <button onClick={() => setLogoutConfirm(true)}
          className="text-gray-400 hover:text-white text-xs bg-gray-700 hover:bg-gray-600 px-2.5 py-1.5 rounded-lg">
          Logout
        </button>
      </div>
    </header>

    {/* Logout confirmation modal */}
    {logoutConfirm && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 className="text-white font-semibold text-lg mb-2">Sign out?</h3>
          <p className="text-gray-400 text-sm mb-5">Your session will be ended and you will be returned to the login screen.</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setLogoutConfirm(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
