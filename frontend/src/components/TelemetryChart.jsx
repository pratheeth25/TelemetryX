import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { useState, useEffect } from "react";
import useStore from "../store/useStore";
import { fetchHistory } from "../services/api";

const METRICS = [
  { key: "temperature",    label: "Temp (°C)",   color: "#f97316", unit: "°C",  yDomain: [0, 100]  },
  { key: "battery",        label: "Battery (%)", color: "#10b981", unit: "%",   yDomain: [0, 100]  },
  { key: "signalStrength", label: "Signal (dBm)",color: "#3b82f6", unit: " dBm",yDomain: [-100, 0] },
  { key: "latency",        label: "Latency (ms)",color: "#a78bfa", unit: " ms", yDomain: [0, 300]  },
];

const LIMITS = [
  { label: "20 pts",  value: 20  },
  { label: "50 pts",  value: 50  },
  { label: "100 pts", value: 100 },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      <p className="text-gray-400 mb-1.5">Point #{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-white font-semibold">{p.value?.toFixed?.(1) ?? p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function TelemetryChart({ deviceId }) {
  const history    = useStore((s) => s.history[deviceId] || []);
  const setHistory = useStore((s) => s.setHistory);
  const [limit, setLimit]             = useState(50);
  const [activeMetrics, setActiveMetrics] = useState(["temperature", "battery"]);

  useEffect(() => {
    if (!deviceId) return;
    fetchHistory(deviceId, limit)
      .then((data) => setHistory(deviceId, data))
      .catch(console.error);
  }, [deviceId, limit]);

  const data = history.map((r, i) => ({
    i: i + 1,
    temperature:    r.temperature,
    battery:        r.battery,
    signalStrength: r.signalStrength,
    latency:        r.latency,
  }));

  function toggleMetric(key) {
    setActiveMetrics((m) =>
      m.includes(key) ? m.filter((k) => k !== key) : [...m, key]
    );
  }

  const visibleMetrics = METRICS.filter((m) => activeMetrics.includes(m.key));

  const refLines = activeMetrics.includes("temperature")
    ? [{ y: 80, stroke: "#ef4444", label: "⚠ Overtemp" }]
    : [];

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Metric toggles */}
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => (
            <button key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all border ${
                activeMetrics.includes(m.key)
                  ? "border-transparent text-white"
                  : "border-gray-700 text-gray-500 bg-transparent hover:text-gray-300"
              }`}
              style={activeMetrics.includes(m.key) ? { backgroundColor: m.color + "33", color: m.color, borderColor: m.color + "44" } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
        {/* Point limit */}
        <div className="flex gap-1">
          {LIMITS.map((l) => (
            <button key={l.value} onClick={() => setLimit(l.value)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                limit === l.value ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No data yet…</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="i" tick={{ fontSize: 10, fill: "#4b5563" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#4b5563" }} tickLine={false} axisLine={false} width={36} />
            <Tooltip content={<CustomTooltip />} />
            {refLines.map((r) => (
              <ReferenceLine key={r.label} y={r.y} stroke={r.stroke} strokeDasharray="4 2"
                label={{ value: r.label, fill: r.stroke, fontSize: 10 }} />
            ))}
            {visibleMetrics.map((m) => (
              <Line key={m.key} type="monotoneX" dataKey={m.key} name={m.label}
                stroke={m.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
