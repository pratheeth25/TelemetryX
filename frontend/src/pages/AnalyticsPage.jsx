import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { analyticsApi, fetchDevices } from "../services/api";
import useAuthStore from "../store/useAuthStore";

const RANGES = ["15m","1h","6h","24h","7d","30d"];

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#1F2937", border: "none", borderRadius: 8 },
  labelStyle:   { color: "#9CA3AF" },
};

const PIE_COLORS = ["#F87171","#FBBF24","#34D399","#60A5FA","#A78BFA","#F472B6"];

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const canExport = user?.role === "admin" || user?.role === "operator";

  const [range,    setRange]    = useState("24h");
  const [deviceId, setDeviceId] = useState("");
  const [devices,  setDevices]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [telData,  setTelData]  = useState([]);
  const [alertData,setAlertData]= useState(null);
  const [uptime,   setUptime]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [exporting,setExporting]= useState(false);

  useEffect(() => {
    fetchDevices().then(setDevices).catch(console.error);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, t, a, u] = await Promise.all([
          analyticsApi.summary(range),
          analyticsApi.telemetry(range, deviceId),
          analyticsApi.alerts(range),
          analyticsApi.uptime(range),
        ]);
        setSummary(s);
        setTelData(t);
        setAlertData(a);
        setUptime(u);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [range, deviceId]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await analyticsApi.exportCsv(range, deviceId);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `telemetry_${range}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setExporting(false); }
  }

  const chartData = telData.map((b, i) => ({
    label: i + 1,
    temp:    b.avgTemp    != null ? +b.avgTemp.toFixed(1)    : null,
    battery: b.avgBattery != null ? +b.avgBattery.toFixed(1) : null,
    latency: b.avgLatency != null ? +b.avgLatency.toFixed(0) : null,
    loss:    b.avgLoss    != null ? +b.avgLoss.toFixed(1)    : null,
  }));

  const alertTimeline = (alertData?.timeline || []).map((b, i) => ({
    label: i + 1,
    count: b.count,
  }));

  const alertByType = (alertData?.byType || []).map((b) => ({
    name:  b._id,
    value: b.count,
  }));

  const uptimeChart = uptime.slice(0, 20).map((u) => ({
    name:    u.deviceId,
    uptime:  +u.uptimePct.toFixed(1),
  }));

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-white text-xl font-bold">Analytics & Reporting</h1>
          <p className="text-gray-400 text-sm">Historical sensor data and fleet health</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Range picker */}
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  range === r ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                }`}>{r}</button>
            ))}
          </div>
          {/* Device filter */}
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 text-sm">
            <option value="">All Devices</option>
            {devices.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.name}</option>)}
          </select>
          {canExport && (
            <button onClick={handleExport} disabled={exporting}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm">
              {exporting ? "…" : "⬇ CSV"}
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-gray-500 text-center py-10">Loading analytics…</p>}

      {!loading && summary && (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Avg Temperature" value={`${summary.avgTemperature ?? "--"}°C`} color="text-red-400" />
            <StatCard label="Avg Battery"     value={`${summary.avgBattery ?? "--"}%`}     color="text-green-400" />
            <StatCard label="Avg Latency"     value={`${summary.avgLatency ?? "--"} ms`}   color="text-blue-400" />
            <StatCard label="Alerts Fired"    value={summary.totalAlerts}                  color="text-yellow-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Temperature trend */}
            <ChartCard title="Temperature Trend (°C)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" hide />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="temp" stroke="#F87171" dot={false} strokeWidth={2} name="Avg Temp" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Battery trend */}
            <ChartCard title="Battery Trend (%)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" hide />
                  <YAxis domain={[0,100]} stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="battery" stroke="#34D399" dot={false} strokeWidth={2} name="Avg Battery" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Latency trend */}
            <ChartCard title="Latency Trend (ms)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" hide />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="latency" stroke="#60A5FA" dot={false} strokeWidth={2} name="Avg Latency" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Alert frequency */}
            <ChartCard title="Alert Frequency">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={alertTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" hide />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="#FBBF24" radius={[3,3,0,0]} name="Alerts" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Uptime per device */}
            <ChartCard title="Device Uptime (%)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={uptimeChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" domain={[0,100]} stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="uptime" fill="#34D399" radius={[0,3,3,0]} name="Uptime %" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Alerts by type (pie) */}
            <ChartCard title="Alerts by Type">
              {alertByType.length === 0
                ? <p className="text-gray-500 text-center pt-16 text-sm">No alerts in range</p>
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={alertByType} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }>
                        {alertByType.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                )
              }
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <h3 className="text-gray-300 text-sm font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}
