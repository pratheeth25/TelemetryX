import useStore from "../store/useStore";

function StatCard({ label, value, sub, color, icon, ring }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-900 border ${ring} p-5`}>
      {/* Subtle tinted glow */}
      <div className={`absolute inset-0 opacity-5 ${color.replace("text-", "bg-")}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-3xl font-bold leading-none ${color}`}>{value}</p>
          {sub && <p className="text-gray-600 text-xs mt-1.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color.replace("text-", "bg-").replace("400","400/15")}`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default function StatsRow() {
  const devices = Object.values(useStore((s) => s.devices));
  const alerts  = useStore((s) => s.alerts);

  const online  = devices.filter((d) => d.status === "online").length;
  const offline = devices.length - online;
  const active  = alerts.filter((a) => !a.acknowledged).length;
  const avgTemp = devices.length
    ? (devices.reduce((s, d) => s + (d.temperature || 0), 0) / devices.length).toFixed(1)
    : "--";
  const avgBatt = devices.length
    ? (devices.reduce((s, d) => s + (d.battery || 0), 0) / devices.length).toFixed(0)
    : "--";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <StatCard label="Devices" value={devices.length} sub="registered"
        color="text-blue-400" ring="border-blue-400/15"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
      />
      <StatCard label="Online" value={online} sub={`${devices.length ? Math.round(online/devices.length*100) : 0}% uptime`}
        color="text-emerald-400" ring="border-emerald-400/15"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
      />
      <StatCard label="Offline" value={offline} sub="need attention"
        color="text-red-400" ring="border-red-400/15"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
      />
      <StatCard label="Alerts" value={active} sub="unacknowledged"
        color="text-amber-400" ring="border-amber-400/15"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
      />
      <StatCard label="Avg Temp" value={`${avgTemp}°C`} sub={`Avg battery ${avgBatt}%`}
        color="text-orange-400" ring="border-orange-400/15"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>}
      />
    </div>
  );
}
