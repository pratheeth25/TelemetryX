import { useEffect, useState, useCallback } from 'react'
import useStore from '../store/useStore'
import { getAlerts, acknowledgeAlert, resolveAlert } from '../services/api'

const SEVERITY_STYLES = {
  critical: {
    dot:   'bg-red-500',
    badge: 'bg-red-900/50 text-red-300 border border-red-700',
    row:   'border-l-2 border-red-600',
  },
  warning: {
    dot:   'bg-amber-400',
    badge: 'bg-amber-900/50 text-amber-300 border border-amber-700',
    row:   'border-l-2 border-amber-500',
  },
  info: {
    dot:   'bg-blue-400',
    badge: 'bg-blue-900/50 text-blue-300 border border-blue-700',
    row:   'border-l-2 border-blue-600',
  },
}

const STATE_TABS = ['open', 'acknowledged', 'resolved']

function formatRelative(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function AlertRow({ alert, onAck, onResolve }) {
  const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info
  const deviceName = useStore((s) => {
    const d = s.devices.find((d) => d.deviceId === alert.deviceId)
    return d ? d.name : alert.deviceId
  })

  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg bg-gray-800 ${styles.row}`}>
      <span className={`mt-1.5 flex-shrink-0 h-2 w-2 rounded-full ${styles.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-100 leading-snug truncate">{alert.message}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400">{deviceName}</span>
          <span className="text-gray-600">·</span>
          <span className="text-xs text-gray-500">{formatRelative(alert.triggeredAt)}</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${styles.badge}`}>
            {alert.severity}
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-gray-700 text-gray-300">
            {alert.ruleId.replace('_', ' ')}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 flex gap-1">
        {alert.state === 'open' && (
          <button
            onClick={() => onAck(alert.alertId)}
            className="text-[11px] px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            Ack
          </button>
        )}
        {alert.state !== 'resolved' && (
          <button
            onClick={() => onResolve(alert.alertId)}
            className="text-[11px] px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  )
}

export default function AlertPanel() {
  const [activeTab, setActiveTab] = useState('open')
  const [loading, setLoading] = useState(false)
  const { alerts, setAlerts, upsertAlert, updateAlertState } = useStore()

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAlerts()
      setAlerts(data.alerts || [])
    } catch (_) { /* ignore */ }
    finally { setLoading(false) }
  }, [setAlerts])

  // Initial load
  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const handleAck = async (alertId) => {
    try {
      const { alert } = await acknowledgeAlert(alertId, 'operator')
      updateAlertState(alertId, { state: alert.state, acknowledgedAt: alert.acknowledgedAt })
    } catch (_) {}
  }

  const handleResolve = async (alertId) => {
    try {
      const { alert } = await resolveAlert(alertId)
      updateAlertState(alertId, { state: 'resolved', resolvedAt: alert.resolvedAt })
    } catch (_) {}
  }

  const visible = alerts.filter((a) => a.state === activeTab)

  // Counts per tab
  const counts = STATE_TABS.reduce((acc, s) => {
    acc[s] = alerts.filter((a) => a.state === s).length
    return acc
  }, {})

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-white">Alerts</span>
          {counts.open > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white">
              {counts.open}
            </span>
          )}
        </div>
        <button
          onClick={fetchAlerts}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 px-2 pt-1 gap-1">
        {STATE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs rounded-t font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-gray-800 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
            {counts[tab] > 0 && (
              <span className="ml-1.5 text-[10px] bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded-full">
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-72">
        {loading && (
          <p className="text-xs text-gray-500 text-center py-6">Loading…</p>
        )}
        {!loading && visible.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-6">
            No {activeTab} alerts
          </p>
        )}
        {!loading &&
          visible.map((alert) => (
            <AlertRow
              key={alert.alertId}
              alert={alert}
              onAck={handleAck}
              onResolve={handleResolve}
            />
          ))}
      </div>
    </div>
  )
}
