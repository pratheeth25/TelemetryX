import { useEffect, useState } from "react";
import { houseApi } from "../services/api";
import useAuthStore from "../store/useAuthStore";

export default function HousePage() {
  const { user, house: storedHouse, role, setHouse } = useAuthStore();
  const isAdmin = role === "admin";

  const [house,    setLocalHouse]  = useState(storedHouse || null);
  const [loading,  setLoading]     = useState(true);
  const [editing,  setEditing]     = useState(false);
  const [houseName, setHouseName]  = useState("");
  const [saving,   setSaving]      = useState(false);
  const [error,    setError]       = useState("");
  const [success,  setSuccess]     = useState("");

  useEffect(() => {
    houseApi.get()
      .then((data) => { setLocalHouse(data.house); setHouse(data.house); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function startEdit() {
    setHouseName(house?.houseName || "");
    setEditing(true);
    setError("");
    setSuccess("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!houseName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const data = await houseApi.update(houseName.trim());
      setLocalHouse(data.house);
      setHouse(data.house);
      setEditing(false);
      setSuccess("House name updated.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">Loading house info…</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">House Settings</h2>

      {success && (
        <div className="p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* House info card */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-600/40 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              {editing ? (
                <form onSubmit={handleSave} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    required
                  />
                  <button type="submit" disabled={saving}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white text-xs font-medium">
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={() => setEditing(false)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-xs">
                    Cancel
                  </button>
                </form>
              ) : (
                <h3 className="text-white font-semibold text-lg">{house?.houseName || "My House"}</h3>
              )}
              <p className="text-gray-400 text-xs mt-0.5">Household</p>
            </div>
          </div>
          {isAdmin && !editing && (
            <button onClick={startEdit}
              className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-700/40 px-3 py-1.5 rounded-lg transition-colors">
              Rename
            </button>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Activation Code</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-900 rounded-xl p-4 border border-gray-600 text-center">
              <span className="text-white font-mono text-2xl font-bold tracking-[0.25em]">
                {house?.activationCode}
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(house?.activationCode || "")}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 hover:text-white transition-colors"
              title="Copy house code"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Share this activation code with household members so they can join.
          </p>
        </div>

        {/* Stats */}
        {(house?.memberCount !== undefined || house?.deviceCount !== undefined) && (
          <div className="grid grid-cols-2 gap-3 border-t border-gray-700 pt-4">
            <div className="bg-gray-900 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{house?.memberCount ?? "—"}</p>
              <p className="text-gray-400 text-xs mt-0.5">Members</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{house?.deviceCount ?? "—"}</p>
              <p className="text-gray-400 text-xs mt-0.5">Devices</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
