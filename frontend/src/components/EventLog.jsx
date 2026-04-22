import { useEffect } from 'react'
import useStore from '../store/useStore'
import { getEvents } from '../services/api'

const SEVERITY_STYLES = {
  info:     'border-sky-500/20  bg-sky-500/5  text-sky-400',
  warning:  'border-amber-500/20 bg-amber-500/5 text-amber-400',
  critical: 'border-red-500/20  bg-red-500/5  text-red-400',
}

const EVENT_TYPES = [
  '', 'HIGH_TEMPERATURE', 'CRITICAL_TEMPERATURE',
  'LOW_BATTERY', 'CRITICAL_BATTERY',
  'DEVICE_OFFLINE', 'DEVICE_ONLINE', 'DEVICE_ADDED',
]

function EventRow({ event }) {
  const style = SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info
  const time = new Date(event.timestamp).toLocaleTimeString()
  return (
    <div className={`border rounded-lg px-3 py-2.5 text-xs ${style}`}>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="font-semibold font-mono tracking-wide">{event.type}</span>
        <span className="text-gray-500 shrink-0 tabular-nums">{time}</span>
      </div>
      <p className="text-gray-400 truncate leading-relaxed">{event.message}</p>
      <p className="text-gray-600 font-mono text-[10px] mt-0.5 truncate">{event.deviceId}</p>
    </div>
  )
}

export default function EventLog() {
  const events = useStore((s) => s.events)
  const setEvents = useStore((s) => s.setEvents)
  const eventFilters = useStore((s) => s.eventFilters)
  const setEventFilter = useStore((s) => s.setEventFilter)

  // Load initial event history from REST
  useEffect(() => {
    getEvents({ limit: 50 })
      .then(({ events }) => setEvents(events))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = events.filter((e) => {
    if (eventFilters.severity && e.severity !== eventFilters.severity) return false
    if (eventFilters.type && e.type !== eventFilters.type) return false
    return true
  })

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold">Event Log</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {filtered.length} of {events.length} events
          </p>
        </div>
        {events.length > 0 && (
          <button
            onClick={() => setEvents([])}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <select
          value={eventFilters.severity}
          onChange={(e) => setEventFilter('severity', e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={eventFilters.type}
          onChange={(e) => setEventFilter('type', e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t || 'All Types'}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="overflow-y-auto space-y-2 max-h-72 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-10">
            {events.length === 0 ? 'No events yet' : 'No events match current filters'}
          </div>
        ) : (
          filtered.map((event, idx) => (
            <EventRow key={`${event.deviceId}-${event.type}-${idx}`} event={event} />
          ))
        )}
      </div>
    </div>
  )
}
