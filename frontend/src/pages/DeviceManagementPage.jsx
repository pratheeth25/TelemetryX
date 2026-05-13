import { useEffect, useState } from "react";
import { fetchDevices, deviceApi } from "../services/api";
import useAuthStore from "../store/useAuthStore";
import useStore from "../store/useStore";
import StatusBadge from "../components/StatusBadge";
import DeviceConnectionGraph from "../components/DeviceConnectionGraph";

const SMART_DEVICE_TYPES = [
  { value: "smart_speaker",      label: "Smart Speaker / Voice Assistant" },
  { value: "smart_lights",       label: "Smart Lights" },
  { value: "smart_camera",       label: "Smart Security Camera" },
  { value: "smart_door_lock",    label: "Smart Door Lock" },
  { value: "smart_tv",           label: "Smart TV" },
  { value: "robot_vacuum",       label: "Robot Vacuum Cleaner" },
  { value: "smart_doorbell",     label: "Smart Doorbell" },
  { value: "smart_refrigerator", label: "Smart Refrigerator" },
  { value: "sensor_motion",      label: "Motion Sensor" },
  { value: "sensor_smoke",       label: "Smoke Sensor" },
  { value: "sensor_water",       label: "Water Leak Sensor" },
  { value: "sensor_air",         label: "Air Quality Sensor" },
];

const DEVICE_ICONS = {
  smart_speaker: "🔊", smart_lights: "💡", smart_camera: "📷",
  smart_door_lock: "🔒", smart_tv: "📺", robot_vacuum: "🤖",
  smart_doorbell: "🔔", smart_refrigerator: "🧊", sensor_motion: "👁️",
  sensor_smoke: "🚨", sensor_water: "💧", sensor_air: "🌬️",
};

const TYPE_SETTINGS = {
  smart_speaker:      [
    { key: "volume",     label: "Volume",    type: "range",  min: 0,   max: 100, unit: "%",  default: 50 },
    { key: "wakeWord",   label: "Wake Word", type: "text",   default: "Hey TelemetryX" },
    { key: "equalizer",  label: "Equalizer", type: "select", options: ["flat","bass","treble","vocal"], default: "flat" },
  ],
  smart_lights: [
    { key: "brightness", label: "Brightness",         type: "range",  min: 0,    max: 100,  unit: "%",  default: 80 },
    { key: "colorTemp",  label: "Color Temperature",  type: "range",  min: 2700, max: 6500, unit: "K",  default: 4000 },
    { key: "color",      label: "Color",              type: "color",  default: "#ffffff" },
  ],
  smart_camera: [
    { key: "resolution",   label: "Resolution",        type: "select", options: ["720p","1080p","4K"], default: "1080p" },
    { key: "motionDetect", label: "Motion Detection",  type: "bool",   default: true },
    { key: "nightVision",  label: "Night Vision",      type: "bool",   default: true },
  ],
  smart_door_lock: [
    { key: "autoLock",     label: "Auto-Lock",         type: "bool",   default: true },
    { key: "lockTimeout",  label: "Auto-Lock Timeout", type: "number", min: 30, max: 600, unit: "s", default: 60 },
  ],
  smart_tv: [
    { key: "inputSource",  label: "Input Source",      type: "select", options: ["HDMI 1","HDMI 2","HDMI 3","AV"], default: "HDMI 1" },
    { key: "volume",       label: "Volume",            type: "range",  min: 0, max: 100, unit: "%", default: 30 },
  ],
  robot_vacuum: [
    { key: "schedule",     label: "Schedule",          type: "text",   default: "08:00" },
    { key: "suction",      label: "Suction Power",     type: "select", options: ["low","medium","high","max"], default: "medium" },
  ],
  smart_doorbell: [
    { key: "notifyOnRing", label: "Notify on Ring",    type: "bool",   default: true },
    { key: "videoQuality", label: "Video Quality",     type: "select", options: ["720p","1080p"], default: "1080p" },
  ],
  smart_refrigerator: [
    { key: "temperature",  label: "Fridge Temp",       type: "number", min: -5,  max: 10,  unit: "°C", default: 4 },
    { key: "freezerTemp",  label: "Freezer Temp",      type: "number", min: -25, max: -10, unit: "°C", default: -18 },
  ],
  sensor_motion: [
    { key: "sensitivity",  label: "Sensitivity",       type: "select", options: ["low","medium","high"], default: "medium" },
    { key: "cooldown",     label: "Cooldown",          type: "number", min: 10, max: 300, unit: "s", default: 60 },
  ],
  sensor_smoke: [
    { key: "sensitivity",  label: "Sensitivity",       type: "select", options: ["low","medium","high"], default: "medium" },
    { key: "testMode",     label: "Test Mode",         type: "bool",   default: false },
  ],
  sensor_water: [
    { key: "alertThreshold", label: "Alert Threshold", type: "select", options: ["immediate","sustained"], default: "immediate" },
    { key: "audibleAlarm",   label: "Audible Alarm",   type: "bool",   default: true },
  ],
  sensor_air: [
    { key: "pollutantThreshold", label: "Pollutant Alert", type: "number", min: 0, max: 500, unit: "AQI", default: 150 },
    { key: "ventilateAbove",     label: "Ventilate Above", type: "number", min: 0, max: 500, unit: "AQI", default: 100 },
  ],
};

function getDefaultSettings(type) {
  return Object.fromEntries((TYPE_SETTINGS[type] || []).map((s) => [s.key, s.default]));
}

const INITIAL_FORM = {
  name: "", location: "", type: "smart_speaker",
  group: "default", firmwareVersion: "1.0.0", description: "", tags: "",
  settings: getDefaultSettings("smart_speaker"),
};

function FilterSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
      {options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
    </select>
  );
}

function ActionBtn({ onClick, label, color }) {
  return (
    <button onClick={onClick}
      className={`text-xs px-2 py-1 rounded border border-gray-700 hover:bg-gray-700 transition-colors ${color}`}>
      {label}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SettingsFields({ type, settings, onChange }) {
  const schema = TYPE_SETTINGS[type] || [];
  if (schema.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Device Settings</p>
      {schema.map((field) => {
        const val = settings?.[field.key] ?? field.default;
        const set = (v) => onChange({ ...settings, [field.key]: v });
        if (field.type === "select") return (
          <FormRow key={field.key} label={field.label}>
            <select value={val} onChange={(e) => set(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
              {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </FormRow>
        );
        if (field.type === "bool") return (
          <FormRow key={field.key} label={field.label}>
            <button type="button" onClick={() => set(!val)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${val ? "bg-blue-600" : "bg-gray-700"}`}>
              <span className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`}/>
            </button>
          </FormRow>
        );
        if (field.type === "range") return (
          <FormRow key={field.key} label={`${field.label}: ${val}${field.unit || ""}`}>
            <input type="range" min={field.min} max={field.max} value={val}
              onChange={(e) => set(Number(e.target.value))}
              className="w-full accent-blue-500"/>
          </FormRow>
        );
        if (field.type === "color") return (
          <FormRow key={field.key} label={field.label}>
            <div className="flex items-center gap-3">
              <input type="color" value={val} onChange={(e) => set(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent"/>
              <span className="text-gray-400 text-xs font-mono">{val}</span>
            </div>
          </FormRow>
        );
        return (
          <FormRow key={field.key} label={`${field.label}${field.unit ? ` (${field.unit})` : ""}`}>
            <input type={field.type === "number" ? "number" : "text"}
              min={field.min} max={field.max}
              value={val} onChange={(e) => set(field.type === "number" ? Number(e.target.value) : e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"/>
          </FormRow>
        );
      })}
    </div>
  );
}

export default function DeviceManagementPage() {
  const { role } = useAuthStore();       // read from store, not user.role
  const setDeviceEnabled = useStore((s) => s.setDeviceEnabled);
  const isAdmin  = role === "admin";
  const isOp     = role === "operator";

  const [devices,   setDevices]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState({ status: "", enabled: "" });
  const [modal,     setModal]     = useState(null);  // null | "create" | device object
  const [form,      setForm]      = useState(INITIAL_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [audit,     setAudit]     = useState(null);
  const [activeTab, setActiveTab] = useState("devices");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status)  params.set("status",  filter.status);
      if (filter.enabled) params.set("enabled", filter.enabled);
      if (search)         params.set("search",  search);
      const data = await fetchDevices(params.toString() ? `?${params}` : "");
      setDevices(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);
  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() {
    const type = "smart_speaker";
    setForm({ ...INITIAL_FORM, type, settings: getDefaultSettings(type) });
    setError(""); setModal("create");
  }
  function openEdit(d) {
    setForm({ ...INITIAL_FORM, ...d, tags: (d.tags || []).join(", "), settings: d.settings || getDefaultSettings(d.type) });
    setError(""); setModal(d);
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      if (modal === "create") {
        await deviceApi.create({ ...form, tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [] });
      } else {
        const payload = isAdmin
          ? { ...form, tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [] }
          : { enabled: form.enabled, group: form.group, firmwareVersion: form.firmwareVersion, description: form.description };
        await deviceApi.update(modal.deviceId, payload);
      }
      setModal(null); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(device) {
    const newEnabled = !device.enabled;
    const newStatus  = newEnabled ? "online" : "offline";
    setDevices((prev) => prev.map((d) => d.deviceId === device.deviceId
      ? { ...d, enabled: newEnabled, status: newStatus, lastHeartbeat: newEnabled ? d.lastHeartbeat : new Date().toISOString() }
      : d));
    setDeviceEnabled(device.deviceId, newEnabled, newStatus);
    try {
      await deviceApi.toggle(device.deviceId);
    } catch {
      setDevices((prev) => prev.map((d) => d.deviceId === device.deviceId ? { ...d, enabled: device.enabled, status: device.status } : d));
      setDeviceEnabled(device.deviceId, device.enabled, device.status);
    }
  }

  async function handleDelete(deviceId) {
    if (!confirm("Delete this device and all its telemetry history?")) return;
    await deviceApi.delete(deviceId).catch(console.error);
    load();
  }

  async function openAudit(d) {
    const logs = await deviceApi.getAudit(d.deviceId).catch(() => []);
    setAudit({ device: d, logs });
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-white text-xl font-bold">Device Management</h1>
          <p className="text-gray-400 text-sm">{devices.length} devices registered</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <span className="text-lg leading-none">+</span> Add Device
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-800 rounded-lg p-1 w-fit">
        {["devices","graph"].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === t ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
            {t === "devices" ? "Devices" : "Connection Graph"}
          </button>
        ))}
      </div>

      {activeTab === "graph" ? <DeviceConnectionGraph /> : (
        <>
          {isOp && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 mb-4 text-yellow-300 text-sm">
              <span className="font-semibold">Operator:</span> You can toggle devices on/off and reconfigure operational settings.
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / location…"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 w-52" />
            <FilterSelect value={filter.status}
              onChange={(v) => setFilter((p) => ({ ...p, status: v }))}
              options={[["","All Status"],["online","Online"],["offline","Offline"]]} />
            <FilterSelect value={filter.enabled}
              onChange={(v) => setFilter((p) => ({ ...p, enabled: v }))}
              options={[["","All"],["true","Enabled"],["false","Disabled"]]} />
          </div>

          {/* Device list */}
          {loading ? (
            <p className="text-gray-500 text-center mt-10">Loading…</p>
          ) : devices.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg mb-2">No devices found</p>
              {isAdmin && <p className="text-gray-600 text-sm">Click <span className="text-blue-400">Add Device</span> to register your first device.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                    <th className="pb-2 text-left">Device</th>
                    <th className="pb-2 text-left">Type</th>
                    <th className="pb-2 text-left">Status</th>
                    <th className="pb-2 text-left">Power</th>
                    <th className="pb-2 text-left">Last Active</th>
                    <th className="pb-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.deviceId} className={`border-b border-gray-800 hover:bg-gray-800/40 ${!d.enabled ? "opacity-60" : ""}`}>
                      <td className="py-2.5 pr-4">
                        <p className="text-white font-medium">{DEVICE_ICONS[d.type] || "📡"} {d.name}</p>
                        <p className="text-gray-500 text-xs">{d.location}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-300 text-xs">
                        {SMART_DEVICE_TYPES.find((t) => t.value === d.type)?.label || d.type}
                      </td>
                      <td className="py-2.5 pr-4"><StatusBadge status={d.status} /></td>
                      <td className="py-2.5 pr-4">
                        {(isAdmin || isOp) ? (
                          <button onClick={() => handleToggle(d)}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all border ${
                              d.enabled
                                ? "bg-emerald-600/15 text-emerald-400 border-emerald-600/30 hover:bg-red-900/20 hover:text-red-400 hover:border-red-600/30"
                                : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-emerald-600/20 hover:text-emerald-400 hover:border-emerald-600/30"
                            }`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
                            </svg>
                            {d.enabled ? "On" : "Off"}
                          </button>
                        ) : (
                          <span className={`text-xs font-medium ${d.enabled ? "text-emerald-400" : "text-gray-500"}`}>
                            {d.enabled ? "On" : "Off"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">
                        {d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleString() : "Never"}
                      </td>
                      <td className="py-2.5">
                        <div className="flex gap-2 flex-wrap">
                          {isAdmin && (
                            <>
                              <ActionBtn onClick={() => openEdit(d)}   label="Edit"   color="text-blue-400" />
                              <ActionBtn onClick={() => openAudit(d)}  label="Audit"  color="text-purple-400" />
                              <ActionBtn onClick={() => handleDelete(d.deviceId)} label="Delete" color="text-red-400" />
                            </>
                          )}
                          {isOp && (
                            <>
                              <ActionBtn onClick={() => openEdit(d)}  label="Configure" color="text-blue-400" />
                              <ActionBtn onClick={() => openAudit(d)} label="Audit"     color="text-purple-400" />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      {modal !== null && (
        <Modal
          title={modal === "create" ? "Add Device" : (isOp ? `Configure — ${modal.name}` : `Edit — ${modal.name}`)}
          onClose={() => setModal(null)}>
          <div className="space-y-3">
            {/* Operator: operational-only config */}
            {isOp && modal !== "create" && (
              <>
                <FormRow label="Group">
                  <input value={form.group || ""} onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </FormRow>
                <FormRow label="Firmware Version">
                  <input value={form.firmwareVersion || ""} onChange={(e) => setForm((p) => ({ ...p, firmwareVersion: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </FormRow>
                <FormRow label="Description">
                  <input value={form.description || ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                </FormRow>
                <SettingsFields type={form.type} settings={form.settings}
                  onChange={(s) => setForm((p) => ({ ...p, settings: s }))} />
              </>
            )}

            {/* Admin: full form */}
            {isAdmin && (
              <>
                {[
                  { label: "Device Name *", key: "name",            placeholder: "e.g. Living Room Speaker" },
                  { label: "Location",       key: "location",        placeholder: "e.g. Living Room" },
                  { label: "Group",          key: "group",           placeholder: "default" },
                  { label: "Firmware",       key: "firmwareVersion", placeholder: "1.0.0" },
                  { label: "Description",    key: "description",     placeholder: "Optional" },
                  { label: "Tags (comma)",   key: "tags",            placeholder: "outdoor, critical" },
                ].map(({ label, key, placeholder }) => (
                  <FormRow key={key} label={label}>
                    <input value={form[key] || ""} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500" />
                  </FormRow>
                ))}
                <FormRow label="Device Type">
                  <select value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, settings: getDefaultSettings(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
                    {SMART_DEVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{DEVICE_ICONS[t.value]} {t.label}</option>
                    ))}
                  </select>
                </FormRow>
                {modal !== "create" && (
                  <FormRow label="Power State">
                    <select value={String(form.enabled ?? true)} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.value === "true" }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm">
                      <option value="true">On — Active</option>
                      <option value="false">Off — Disabled</option>
                    </select>
                  </FormRow>
                )}
                {/* Device-type specific settings */}
                <SettingsFields type={form.type} settings={form.settings}
                  onChange={(s) => setForm((p) => ({ ...p, settings: s }))} />
              </>
            )}

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm">
                {saving ? "Saving…" : modal === "create" ? "Add Device" : "Save Changes"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Audit Modal */}
      {audit && (
        <Modal title={`Audit — ${audit.device.name}`} onClose={() => setAudit(null)}>
          {audit.logs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No audit logs found.</p>
          ) : (
            <div className="space-y-2">
              {audit.logs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 bg-gray-800/60 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium">{log.action}</p>
                    <p className="text-gray-500 text-xs">{log.actorName} · {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
