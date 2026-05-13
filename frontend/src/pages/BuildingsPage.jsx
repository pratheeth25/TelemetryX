import { useEffect, useState } from "react";
import { buildingApi, authApi } from "../services/api";
import useAuthStore from "../store/useAuthStore";

const BUILDING_TYPES = ["House","Office","Factory","Warehouse","Apartment","Hospital","School","Custom"];

const BUILDING_ICONS = {
  House:"🏠", Office:"🏢", Factory:"🏭", Warehouse:"🏗️",
  Apartment:"🏬", Hospital:"🏥", School:"🏫", Custom:"🔧",
};

const INIT_FORM = { name: "", buildingType: "House", address: "", description: "" };

export default function BuildingsPage() {
  const { user } = useAuthStore();
  const isAdmin  = user?.role === "admin";
  const isOp     = user?.role === "operator";

  const [buildings,   setBuildings]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(null);   // null | "create" | building-obj
  const [form,        setForm]        = useState(INIT_FORM);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState("");
  const [accessPanel, setAccessPanel] = useState(null);  // building obj whose access we manage
  const [grants,      setGrants]      = useState([]);
  const [allUsers,    setAllUsers]    = useState([]);
  const [devicePanel, setDevicePanel] = useState(null);  // building obj for device assignment
  const [bldDevices,  setBldDevices]  = useState([]);
  const [grantUser,   setGrantUser]   = useState("");

  async function loadBuildings() {
    setLoading(true);
    try { setBuildings(await buildingApi.list()); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadBuildings();
    if (isAdmin) authApi.listUsers().then(setAllUsers).catch(() => {});
  }, []);

  function openCreate() { setForm(INIT_FORM); setFormErr(""); setModal("create"); }
  function openEdit(b)  { setForm({ name: b.name, buildingType: b.buildingType, address: b.address || "", description: b.description || "" }); setFormErr(""); setModal(b); }

  async function handleSave() {
    setSaving(true); setFormErr("");
    try {
      if (modal === "create") await buildingApi.create(form);
      else                    await buildingApi.update(modal.buildingId, form);
      setModal(null);
      loadBuildings();
    } catch (e) { setFormErr(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(b) {
    if (!confirm(`Delete building "${b.name}" and unlink all its devices?`)) return;
    await buildingApi.delete(b.buildingId).catch(console.error);
    loadBuildings();
  }

  async function openAccess(b) {
    setAccessPanel(b);
    const list = await buildingApi.getAccess(b.buildingId).catch(() => []);
    setGrants(list);
    if (!isAdmin) {
      const u = await authApi.listUsers().catch(() => []);
      setAllUsers(u);
    }
  }

  async function handleGrant() {
    if (!grantUser) return;
    await buildingApi.grantAccess(accessPanel.buildingId, grantUser).catch(console.error);
    const list = await buildingApi.getAccess(accessPanel.buildingId).catch(() => []);
    setGrants(list);
    setGrantUser("");
  }

  async function handleRevoke(uid) {
    await buildingApi.revokeAccess(accessPanel.buildingId, uid).catch(console.error);
    setGrants((g) => g.filter((x) => x.userId !== uid));
  }

  async function openDevices(b) {
    setDevicePanel(b);
    const list = await buildingApi.getDevices(b.buildingId).catch(() => []);
    setBldDevices(list);
  }

  const viewerUsers = allUsers.filter((u) => u.role === "viewer");

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-xl font-bold">Buildings</h1>
          <p className="text-gray-400 text-sm">{buildings.length} building{buildings.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium w-fit">
          + New Building
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center mt-10">Loading…</p>
      ) : buildings.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <p className="text-4xl mb-3">🏗️</p>
          <p>No buildings yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {buildings.map((b) => (
            <BuildingCard
              key={b.buildingId}
              building={b}
              isAdmin={isAdmin}
              onEdit={() => openEdit(b)}
              onDelete={() => handleDelete(b)}
              onManageAccess={() => openAccess(b)}
              onViewDevices={() => openDevices(b)}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal !== null && (
        <Modal title={modal === "create" ? "New Building" : `Edit — ${modal.name}`}
          onClose={() => setModal(null)}>
          <div className="space-y-3">
            <FormRow label="Building Name *">
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="My Home"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            </FormRow>
            <FormRow label="Type">
              <select value={form.buildingType} onChange={(e) => setForm((p) => ({ ...p, buildingType: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
                {BUILDING_TYPES.map((t) => (
                  <option key={t} value={t}>{BUILDING_ICONS[t]} {t}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Address">
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="123 Main St, City"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            </FormRow>
            <FormRow label="Description">
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional notes"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            </FormRow>
            {formErr && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{formErr}</p>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Access Management Panel ── */}
      {accessPanel && (
        <Modal title={`Viewer Access — ${accessPanel.name}`} onClose={() => setAccessPanel(null)}>
          <div className="space-y-4">
            {/* Grant section */}
            <div>
              <label className="text-gray-400 text-xs block mb-1">Grant access to a viewer</label>
              <div className="flex gap-2">
                <select value={grantUser} onChange={(e) => setGrantUser(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm">
                  <option value="">— Select viewer —</option>
                  {viewerUsers
                    .filter((u) => !grants.some((g) => g.userId === u._id))
                    .map((u) => (
                      <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                    ))}
                </select>
                <button onClick={handleGrant} disabled={!grantUser}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-sm">
                  Grant
                </button>
              </div>
            </div>

            {/* Current grants */}
            <div>
              <p className="text-gray-400 text-xs mb-2">Current viewers with access</p>
              {grants.length === 0 ? (
                <p className="text-gray-600 text-sm">No viewers granted yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {grants.map((g) => (
                    <div key={g._id} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-white text-sm">{g.userName}</p>
                        <p className="text-gray-500 text-xs">{g.userEmail}</p>
                      </div>
                      <button onClick={() => handleRevoke(g.userId)}
                        className="text-red-400 hover:text-red-300 text-xs">Revoke</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Building Devices Panel ── */}
      {devicePanel && (
        <Modal title={`Devices — ${devicePanel.name}`} onClose={() => setDevicePanel(null)}>
          {bldDevices.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No devices assigned to this building.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {bldDevices.map((d) => (
                <div key={d.deviceId} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2 text-sm">
                  <div>
                    <p className="text-white font-medium">{d.name}</p>
                    <p className="text-gray-500 text-xs">{d.location} · {d.type}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === "online" ? "bg-green-500/20 text-green-400" : "bg-gray-600 text-gray-400"}`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function BuildingCard({ building: b, isAdmin, onEdit, onDelete, onManageAccess, onViewDevices }) {
  const icon = BUILDING_ICONS[b.buildingType] || "🏠";
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-3xl">{icon}</span>
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{b.buildingType}</span>
      </div>
      <div>
        <h3 className="text-white font-semibold text-base">{b.name}</h3>
        {b.address && <p className="text-gray-500 text-xs mt-0.5 truncate">{b.address}</p>}
        {b.description && <p className="text-gray-400 text-xs mt-1">{b.description}</p>}
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 pt-1 border-t border-gray-700">
        <span>📦 {b.deviceCount ?? 0} devices</span>
        <span className="text-gray-700">|</span>
        <span className="truncate">👤 {b.ownerName || b.ownerId}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <ActionBtn onClick={onViewDevices} label="Devices" color="text-blue-400" />
        <ActionBtn onClick={onManageAccess} label="Access" color="text-purple-400" />
        <ActionBtn onClick={onEdit} label="Edit" color="text-yellow-400" />
        {isAdmin && <ActionBtn onClick={onDelete} label="Delete" color="text-red-400" />}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, label, color }) {
  return <button onClick={onClick} className={`${color} hover:underline text-xs`}>{label}</button>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <div>
      <label className="text-gray-400 text-xs block mb-1">{label}</label>
      {children}
    </div>
  );
}
