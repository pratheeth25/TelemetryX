import { useEffect, useCallback } from 'react'
import useStore from '../store/useStore'
import { getSystemMetrics } from '../services/api'

function MetricCard({ label, value, sub, valueClass = 'text-white', icon }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-sm">{icon}</span>}
        <p className="text-gray-500 text-[11px] font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

function UptimeBar({ uptimeSec }) {
  const h = Math.floor(uptimeSec / 3600)
  const m = Math.floor((uptimeSec % 3600) / 60)
  const s = uptimeSec % 60
  return (
    <span className="font-mono text-emerald-400">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

export default function SystemHealthDashboard() {
  const systemMetrics  = useStore((s) => s.systemMetrics)
  const setSystemMetrics = useStore((s) => s.setSystemMetrics)

  const refresh = useCallback(async () => {
    try {
      const m = await getSystemMetrics()
      setSystemMetrics(m)
    } catch (_) {}
  }, [setSystemMetrics])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  if (!systemMetrics) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-700 px-4 py-6 text-center text-gray-600 text-sm">
        Loading system metrics…
      </div>
    )
  }

  const { uptimeSec, activeDevices, eventsPerSecond, anomaliesPerMinute, process: proc, network } = systemMetrics

  const successPct = network ? Math.round((network.successRate ?? 1) * 100) : null

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">System Health</h2>
        <span className="text-[10px] text-gray-600">
          Updated {new Date(systemMetrics.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          icon="⏱"
          label="Uptime"
          value={<UptimeBar uptimeSec={uptimeSec} />}
          sub="server running"
        />
        <MetricCard
          icon="📡"
          label="Active Devices"
          value={activeDevices}
          valueClass="text-sky-400"
          sub="in simulation"
        />
        <MetricCard
          icon="⚡"
          label="Events / sec"
          value={eventsPerSecond.toFixed(2)}
          valueClass={eventsPerSecond > 5 ? 'text-amber-400' : 'text-emerald-400'}
          sub="last 60 s"
        />
        <MetricCard
          icon="⚠"
          label="Anomalies / min"
          value={anomaliesPerMinute}
          valueClass={anomaliesPerMinute > 3 ? 'text-red-400' : anomaliesPerMinute > 0 ? 'text-amber-400' : 'text-emerald-400'}
          sub="last 60 s"
        />
        <MetricCard
          icon="🧠"
          label="Heap Used"
          value={`${proc.heapUsedMb} MB`}
          valueClass="text-purple-400"
          sub={`RSS ${proc.rss_mb} MB`}
        />
        {successPct !== null && (
          <MetricCard
            icon="🛰"
            label="Net Delivery"
            value={`${successPct}%`}
            valueClass={successPct >= 90 ? 'text-emerald-400' : successPct >= 70 ? 'text-amber-400' : 'text-red-400'}
            sub={`avg ${network.avgLatencyMs}ms`}
          />
        )}
      </div>
    </div>
  )
}
