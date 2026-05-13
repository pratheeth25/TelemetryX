import { useEffect, useState } from "react";
import { buildingApi, authApi } from "../services/api";
import useBuildingStore from "../store/useBuildingStore";
import useAuthStore from "../store/useAuthStore";

const BUILDING_ICONS = {
  House:     "🏠",
  Office:    "🏢",
  Factory:   "🏭",
  Warehouse: "🏗️",
  Apartment: "🏬",
  Hospital:  "🏥",
  School:    "🏫",
  Custom:    "🔧",
};

const TYPE_COLORS = {
  House:     "border-green-500/50 bg-green-500/10 hover:border-green-400",
  Office:    "border-blue-500/50 bg-blue-500/10 hover:border-blue-400",
  Factory:   "border-orange-500/50 bg-orange-500/10 hover:border-orange-400",
  Warehouse: "border-yellow-500/50 bg-yellow-500/10 hover:border-yellow-400",
  Apartment: "border-purple-500/50 bg-purple-500/10 hover:border-purple-400",
  Hospital:  "border-red-500/50 bg-red-500/10 hover:border-red-400",
  School:    "border-teal-500/50 bg-teal-500/10 hover:border-teal-400",
  Custom:    "border-gray-500/50 bg-gray-500/10 hover:border-gray-400",
};

export default function BuildingSelector({ onSelect, allowSkip = false }) {
  const [buildings, setBuildings] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { user, clearAuth }       = useAuthStore();
  const { selectedBuilding, clearBuilding } = useBuildingStore();

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    clearBuilding();
    clearAuth();
  }

  function loadBuildings() {
    setLoading(true);
    setError(null);
    buildingApi.list()
      .then(setBuildings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadBuildings(); }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="text-5xl">📡</span>
        <h1 className="text-white text-3xl font-bold mt-3">TelemetryX</h1>
        <p className="text-gray-400 mt-2">
          Welcome, <span className="text-blue-400 font-medium">{user?.name}</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">Select a building to start monitoring</p>
      </div>

      {loading && (
        <p className="text-gray-500">Loading your buildings…</p>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3 text-red-400 text-sm mb-6 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button onClick={loadBuildings}
            className="text-xs bg-red-500/20 hover:bg-red-500/30 px-2 py-1 rounded text-red-300 whitespace-nowrap">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && buildings.length === 0 && (
        <div className="text-center">
          <p className="text-gray-400 text-lg">No buildings assigned yet.</p>
          <p className="text-gray-500 text-sm mt-2">Contact an operator or admin to get access.</p>
          <button
            onClick={() => setLogoutConfirm(true)}
            className="mt-6 bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 text-red-400 text-sm px-5 py-2 rounded-lg transition-colors">
            Logout
          </button>
        </div>
      )}

      {/* Building grid */}
      {buildings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
          {buildings.map((b) => {
            const icon   = BUILDING_ICONS[b.buildingType] || "🏠";
            const colors = TYPE_COLORS[b.buildingType] || TYPE_COLORS.Custom;
            const isCurrent = selectedBuilding?.buildingId === b.buildingId;

            return (
              <button
                key={b.buildingId}
                onClick={() => onSelect(b)}
                className={`border-2 rounded-2xl p-5 text-left transition-all cursor-pointer ${colors} ${
                  isCurrent ? "ring-2 ring-blue-500" : ""
                }`}>
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{icon}</span>
                  {isCurrent && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Active</span>
                  )}
                </div>
                <h3 className="text-white font-semibold text-lg mt-3">{b.name}</h3>
                <p className="text-gray-400 text-sm mt-0.5">{b.buildingType}</p>
                {b.address && (
                  <p className="text-gray-600 text-xs mt-1 truncate">{b.address}</p>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <span>📦 {b.deviceCount ?? 0} device{b.deviceCount !== 1 ? "s" : ""}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Skip / Continue with previous selection */}
      {allowSkip && (
        <button
          onClick={() => onSelect(selectedBuilding)}
          className="mt-8 text-gray-500 hover:text-gray-300 text-sm underline">
          Continue with current building
        </button>
      )}

      {/* Logout confirmation modal */}
      {logoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold text-lg mb-2">Sign out?</h3>
            <p className="text-gray-400 text-sm mb-5">You will be returned to the login screen.</p>
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
    </div>
  );
}
