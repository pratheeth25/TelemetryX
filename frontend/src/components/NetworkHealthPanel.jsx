import { useState, useEffect, useCallback } from 'react'
import useStore from '../store/useStore'
import { toggleNetworkSimulation, getNetworkStatus } from '../services/api'

function Gauge({ label, value, max, unit, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className={`font-mono font-semibold ${color}`}>{value}{unit}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color.replace('text-', 'bg-')}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function MetricPill({ label, value, sub, pulse }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2 text-center">
      <p className={`text-lg font-bold tabular-nums text-white ${pulse ? 'animate-pulse' : ''}`}>{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function NetworkHealthPanel() {
  const networkMetrics  = useStore((s) => s.networkMetrics)
  const networkState    = useStore((s) => s.networkState)
  const setNetworkState = useStore((s) => s.setNetworkState)
  const setNetworkMetrics = useStore((s) => s.setNetworkMetrics)

  const [delayMin, setDelayMin] = useState('2000')
  const [delayMax, setDelayMax] = useState('10000')
  const [loss,     setLoss]     = useState('5')
  const [burst,    setBurst]    = useState('15')
  const [batch,    setBatch]    = useState('0')
  const [bw,       setBw]       = useState('0')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Seed inputs once first status arrives
  useEffect(() => {
    if (!networkMetrics) return
    setDelayMin(String(networkMetrics.delayMinMs ?? 2000))
    setDelayMax(String(networkMetrics.delayMaxMs ?? 10000))
    setLoss(String(Math.round((networkMetrics.packetLossRate ?? 0.05) * 100)))
    setBurst(String(Math.round((networkMetrics.burstLossRate ?? 0.15) * 100)))
    setBatch(String(networkMetrics.batchWindowMs ?? 0))
    setBw(String(networkMetrics.bandwidthBps ?? 0))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    try {
      const s = await getNetworkStatus()
      setNetworkMetrics(s)
      setNetworkState({ enabled: s.enabled, delayMs: s.delayMs, packetLossRate: s.packetLossRate })
    } catch (_) {}
  }, [setNetworkMetrics, setNetworkState])

  // Poll every 3 s
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [refresh])

  async function apply(body) {
    setLoading(true); setError('')
    try {
      const res = await toggleNetworkSimulation(body)
      setNetworkMetrics(res)
      setNetworkState({ enabled: res.enabled, delayMs: res.delayMs, packetLossRate: res.packetLossRate })
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleToggle = () => apply({
    enabled:       !networkState.enabled,
    delayMinMs:    parseInt(delayMin, 10)  || 2000,
    delayMaxMs:    parseInt(delayMax, 10)  || 10000,
    packetLossRate: parseInt(loss, 10) / 100,
    burstLossRate:  parseInt(burst, 10) / 100,
    batchWindowMs:  parseInt(batch, 10) || 0,
    bandwidthBps:   parseInt(bw, 10)    || 0,
  })

  const handleApply = () => apply({
    enabled:       networkState.enabled,
    delayMinMs:    parseInt(delayMin, 10)  || 2000,
    delayMaxMs:    parseInt(delayMax, 10)  || 10000,
    packetLossRate: parseInt(loss, 10) / 100,
    burstLossRate:  parseInt(burst, 10) / 100,
    batchWindowMs:  parseInt(batch, 10) || 0,
    bandwidthBps:   parseInt(bw, 10)    || 0,
  })

  const m = networkMetrics?.metrics
  const successPct = m ? Math.round((m.successRate ?? 1) * 100) : 100

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Satellite Link Simulation</h2>
          <p className="text-xs text-gray-500 mt-0.5">Variable latency · burst loss · throttle · batching</p>
        </div>
        <div className="flex items-center gap-2">
          {networkMetrics?.inBurst && (
            <span className="text-[10px] bg-red-900/50 text-red-400 border border-red-700 px-2 py-0.5 rounded-full animate-pulse">
              BURST OUTAGE
            </span>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
            networkState.enabled
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-gray-700/50 text-gray-500 border-gray-700'
          }`}>
            {networkState.enabled ? '● Active' : '○ Off'}
          </span>
        </div>
      </div>

      {/* Live metric pills */}
      {m && (
        <div className="grid grid-cols-4 gap-2">
          <MetricPill label="Success" value={`${successPct}%`} sub={`${m.delivered} delivered`} pulse={successPct < 80} />
          <MetricPill label="Dropped" value={m.dropped} sub="last 60s" />
          <MetricPill label="Avg Latency" value={`${m.avgLatencyMs}ms`} />
          <MetricPill label="Burst" value={m.inBurst ? 'YES' : 'NO'} pulse={m.inBurst} />
        </div>
      )}

      {/* Delivery bar */}
      <Gauge
        label="Delivery Success Rate"
        value={successPct}
        max={100}
        unit="%"
        color={successPct >= 90 ? 'text-emerald-400' : successPct >= 70 ? 'text-amber-400' : 'text-red-400'}
      />

      {/* Config sliders */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {/* Delay min */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Min Delay</span>
            <span className="text-gray-300 font-mono">{delayMin}ms</span>
          </div>
          <input type="range" min="0" max="10000" step="500"
            value={delayMin} onChange={(e) => setDelayMin(e.target.value)}
            className="w-full accent-sky-500 h-1.5" />
        </div>
        {/* Delay max */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Max Delay</span>
            <span className="text-gray-300 font-mono">{delayMax}ms</span>
          </div>
          <input type="range" min="0" max="30000" step="500"
            value={delayMax} onChange={(e) => setDelayMax(e.target.value)}
            className="w-full accent-sky-500 h-1.5" />
        </div>
        {/* Packet loss */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Packet Loss</span>
            <span className="text-gray-300 font-mono">{loss}%</span>
          </div>
          <input type="range" min="0" max="100" step="5"
            value={loss} onChange={(e) => setLoss(e.target.value)}
            className="w-full accent-amber-500 h-1.5" />
        </div>
        {/* Burst loss */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Burst Loss</span>
            <span className="text-gray-300 font-mono">{burst}%</span>
          </div>
          <input type="range" min="0" max="100" step="5"
            value={burst} onChange={(e) => setBurst(e.target.value)}
            className="w-full accent-red-500 h-1.5" />
        </div>
        {/* Batch window */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Batch Window</span>
            <span className="text-gray-300 font-mono">{batch === '0' ? 'off' : `${batch}ms`}</span>
          </div>
          <input type="range" min="0" max="5000" step="250"
            value={batch} onChange={(e) => setBatch(e.target.value)}
            className="w-full accent-purple-500 h-1.5" />
        </div>
        {/* Bandwidth */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Bandwidth Cap</span>
            <span className="text-gray-300 font-mono">{bw === '0' ? 'unlimited' : `${bw} B/s`}</span>
          </div>
          <input type="range" min="0" max="10000" step="500"
            value={bw} onChange={(e) => setBw(e.target.value)}
            className="w-full accent-teal-500 h-1.5" />
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            networkState.enabled
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              : 'bg-amber-600 hover:bg-amber-500 text-white'
          }`}
        >
          {networkState.enabled ? 'Disable' : 'Enable Satellite Mode'}
        </button>
        <button
          onClick={handleApply}
          disabled={loading}
          className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Applying…' : 'Apply Config'}
        </button>
      </div>
    </div>
  )
}
