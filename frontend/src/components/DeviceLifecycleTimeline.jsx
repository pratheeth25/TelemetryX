import { useEffect, useState } from 'react'
import useStore from '../store/useStore'
import { getLifecycleHistory, setLifecycleState } from '../services/api'

const STATE_CONFIG = {
  ACTIVE:      { color: 'bg-emerald-500',  text: 'text-emerald-400', label: 'Active',      icon: '●' },
  INACTIVE:    { color: 'bg-gray-500',     text: 'text-gray-400',    label: 'Inactive',    icon: '○' },
  MAINTENANCE: { color: 'bg-amber-500',    text: 'text-amber-400',   label: 'Maintenance', icon: '⚙' },
  FAILED:      { color: 'bg-red-600',      text: 'text-red-400',     label: 'Failed',      icon: '✕' },
}

const VALID_STATES = Object.keys(STATE_CONFIG)

function formatTs(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function StateBadge({ state }) {
  const cfg = STATE_CONFIG[state] || STATE_CONFIG.ACTIVE
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg.text}`}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  )
}

export default function DeviceLifecycleTimeline({ deviceId }) {
  const { lifecycleHistories, setLifecycleHistory, prependLifecycleEvent } = useStore()
  const history = lifecycleHistories[deviceId] || []
  const [loading, setLoading] = useState(false)
  const [overrideState, setOverrideState] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [saving, setSaving] = useState(false)

  const device = useStore((s) => s.devices.find((d) => d.deviceId === deviceId))
  const currentState = device?.lifecycleState || 'ACTIVE'

  useEffect(() => {
    if (!deviceId) return
    setLoading(true)
    getLifecycleHistory(deviceId)
      .then((data) => setLifecycleHistory(deviceId, data.history || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [deviceId, setLifecycleHistory])

  const handleOverride = async () => {
    if (!overrideState) return
    setSaving(true)
    try {
      await setLifecycleState(deviceId, overrideState, overrideReason)
      const event = {
        deviceId,
        fromState: currentState,
        toState: overrideState,
        reason: overrideReason || 'Manual override',
        source: 'manual',
        timestamp: new Date().toISOString(),
      }
      prependLifecycleEvent(event)
      setOverrideState('')
      setOverrideReason('')
    } catch (_) {}
    finally { setSaving(false) }
  }

  if (!deviceId) return null

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Lifecycle Timeline</span>
          <StateBadge state={currentState} />
        </div>
        <span className="text-xs text-gray-500">{device?.name || deviceId}</span>
      </div>

      {/* Manual override */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={overrideState}
          onChange={(e) => setOverrideState(e.target.value)}
          className="text-xs bg-gray-800 border border-gray-600 text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          <option value="">Set state…</option>
          {VALID_STATES.map((s) => (
            <option key={s} value={s}>{STATE_CONFIG[s].label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Reason (optional)"
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          maxLength={200}
          className="flex-1 min-w-0 text-xs bg-gray-800 border border-gray-600 text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
        <button
          disabled={!overrideState || saving}
          onClick={handleOverride}
          className="text-xs px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          {saving ? 'Saving…' : 'Apply'}
        </button>
      </div>

      {/* Timeline */}
      {loading && <p className="text-xs text-gray-500 text-center py-4">Loading…</p>}
      {!loading && history.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-4">No transitions recorded</p>
      )}
      {!loading && history.length > 0 && (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-700" />

          {history.map((evt, idx) => {
            const cfg = STATE_CONFIG[evt.toState] || STATE_CONFIG.ACTIVE
            return (
              <div key={idx} className="relative flex gap-3 pb-4 last:pb-0">
                {/* Dot */}
                <div className={`relative flex-shrink-0 mt-0.5 h-3.5 w-3.5 rounded-full border-2 border-gray-900 ${cfg.color}`} />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StateBadge state={evt.toState} />
                    {evt.fromState && (
                      <span className="text-[10px] text-gray-600">
                        from {STATE_CONFIG[evt.fromState]?.label || evt.fromState}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      evt.source === 'manual'
                        ? 'bg-blue-900/40 text-blue-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {evt.source}
                    </span>
                  </div>
                  {evt.reason && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{evt.reason}</p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-0.5">{formatTs(evt.timestamp)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
