import { useState } from 'react'
import useStore from '../store/useStore'
import { toggleNetworkSimulation } from '../services/api'

export default function NetworkControls() {
  const networkState = useStore((s) => s.networkState)
  const setNetworkState = useStore((s) => s.setNetworkState)

  const [delayInput, setDelayInput] = useState(String(networkState.delayMs))
  const [lossInput, setLossInput] = useState(String(Math.round(networkState.packetLossRate * 100)))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function call(body) {
    setLoading(true)
    setError('')
    try {
      const res = await toggleNetworkSimulation(body)
      setNetworkState({ enabled: res.enabled, delayMs: res.delayMs, packetLossRate: res.packetLossRate })
      setDelayInput(String(res.delayMs))
      setLossInput(String(Math.round(res.packetLossRate * 100)))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () =>
    call({
      enabled: !networkState.enabled,
      delayMs: parseInt(delayInput, 10) || networkState.delayMs,
      packetLossRate: (parseInt(lossInput, 10) || 0) / 100,
    })

  const handleApply = () =>
    call({
      enabled: networkState.enabled,
      delayMs: parseInt(delayInput, 10) || networkState.delayMs,
      packetLossRate: (parseInt(lossInput, 10) || 0) / 100,
    })

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-semibold">Network Simulation</h2>
          <p className="text-gray-500 text-xs mt-0.5">Inject delay & packet loss</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
          networkState.enabled
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-gray-700/50 text-gray-500 border-gray-700'
        }`}>
          {networkState.enabled ? '● Active' : '○ Off'}
        </span>
      </div>

      {/* Toggle row */}
      <div className="flex items-center justify-between mb-5 p-3 bg-gray-900 rounded-lg">
        <div>
          <p className="text-sm text-gray-300 font-medium">Network Degradation</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {networkState.enabled
              ? `${networkState.delayMs}ms delay · ${Math.round(networkState.packetLossRate * 100)}% loss`
              : 'All packets pass through instantly'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-500 disabled:opacity-50 ${
            networkState.enabled ? 'bg-amber-500' : 'bg-gray-700'
          }`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            networkState.enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Delay slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-gray-400">Artificial Delay</label>
          <span className="text-xs text-gray-300 tabular-nums font-mono">{delayInput} ms</span>
        </div>
        <input
          type="range" min="0" max="3000" step="50"
          value={delayInput}
          onChange={(e) => setDelayInput(e.target.value)}
          className="w-full accent-sky-500 h-1.5"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>0 ms</span><span>1500 ms</span><span>3000 ms</span>
        </div>
      </div>

      {/* Packet loss slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-gray-400">Packet Loss Rate</label>
          <span className="text-xs text-gray-300 tabular-nums font-mono">{lossInput}%</span>
        </div>
        <input
          type="range" min="0" max="100" step="5"
          value={lossInput}
          onChange={(e) => setLossInput(e.target.value)}
          className="w-full accent-amber-500 h-1.5"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-xs mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors disabled:opacity-50 font-medium"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-gray-400/30 border-t-gray-200 rounded-full animate-spin" />
            Applying…
          </span>
        ) : 'Apply Configuration'}
      </button>
    </div>
  )
}
