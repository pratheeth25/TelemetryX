import { useState, useMemo } from "react";
import StatsRow from "../components/StatsRow";
import DeviceGrid from "../components/DeviceGrid";
import AlertPanel from "../components/AlertPanel";
import DeviceDetail from "../components/DeviceDetail";
import DeviceConnectionGraph from "../components/DeviceConnectionGraph";
import TelemetryChart from "../components/TelemetryChart";
import useStore from "../store/useStore";
import useAuthStore from "../store/useAuthStore";

function EventTimeline() {
  const alerts = useStore((s) => s.alerts).slice(0, 8);
  if (alerts.length === 0) {
    return <p className="text-gray-600 text-sm text-center py-6">No recent events</p>;
  }
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div key={a._id ?? a.id ?? Math.random()} className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-gray-800/60 transition-colors">
          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.severity === "critical" ? "bg-red-500" : a.severity === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
          <div className="min-w-0 flex-1">
            <p className="text-gray-200 text-xs font-medium truncate">{a.message ?? a.type ?? "Event"}</p>
            <p className="text-gray-600 text-xs">{a.deviceId ?? ""}</p>
          </div>
          <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${a.acknowledged ? "bg-gray-800 text-gray-600" : "bg-amber-500/15 text-amber-400"}`}>
            {a.acknowledged ? "ack" : "new"}
          </span>
        </div>
      ))}
    </div>
  );
}

function QuickMetricBar({ label, value, max, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-300 font-medium">{value != null ? value : "–"}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const devices = useStore((s) => s.devices);
  const [selected, setSelected] = useState(null);
  const { user, house, role } = useAuthStore();

  const deviceList = Object.values(devices);
  const selectedDevice = selected ? devices[selected] : null;

  const hotDevices = useMemo(() =>
    [...deviceList].sort((a, b) => (b.temperature || 0) - (a.temperature || 0)).slice(0, 3),
    [deviceList]
  );

  return (
    <div className="p-5 space-y-5 max-w-screen-2xl">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {house?.houseName ?? "House"} &nbsp;·&nbsp;
            <span className="text-gray-400">{deviceList.length} devices</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 text-xs font-medium">Live</span>
        </div>
      </div>

      {/* ── Stats row ── */}
      <StatsRow />

      {/* ── Main grid: chart + right sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ─ Left: chart + device grid ─ */}
        <div className="xl:col-span-2 space-y-5">
          {/* Quick telemetry overview for top-3 hot devices */}
          {hotDevices.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-sm">Top Device Metrics</h2>
                <span className="text-gray-600 text-xs">by temperature</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {hotDevices.map((d) => (
                  <div key={d.deviceId}
                    className="space-y-3 cursor-pointer p-3 rounded-xl hover:bg-gray-800/60 transition-colors"
                    onClick={() => setSelected(d.deviceId)}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${d.status === "online" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <p className="text-gray-200 text-xs font-medium truncate">{d.name}</p>
                    </div>
                    <QuickMetricBar label="Temp" value={`${d.temperature?.toFixed(1)}°C`} max={100} color="bg-orange-500" />
                    <QuickMetricBar label="Battery" value={`${d.battery?.toFixed(0)}%`} max={100} color="bg-emerald-500" />
                    <QuickMetricBar label="Signal" value={`${d.signalStrength} dBm`} max={50} color="bg-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected device charts */}
          {selectedDevice && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white font-semibold text-sm">{selectedDevice.name}</h2>
                  <p className="text-gray-500 text-xs">{selectedDevice.location}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <TelemetryChart deviceId={selectedDevice.deviceId} />
            </div>
          )}

          {/* Device grid */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">All Devices</h2>
            <DeviceGrid onSelect={(d) => setSelected(d.deviceId)} />
          </div>

          {/* Connectivity graph */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Device Connectivity</h2>
            <DeviceConnectionGraph />
          </div>
        </div>

        {/* ─ Right sidebar: alerts + event feed ─ */}
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Active Alerts</h2>
            <AlertPanel />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Event Feed</h2>
            <EventTimeline />
          </div>
        </div>
      </div>
    </div>
  );
}
