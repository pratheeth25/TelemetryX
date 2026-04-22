import StatusBadge from './StatusBadge'
import BatteryBar from './BatteryBar'
import useStore from '../store/useStore'

const STATUS_BORDER = {
  online:   'border-emerald-500/20',
  warning:  'border-amber-500/30',
  critical: 'border-red-500/40',
  offline:  'border-gray-700',
}

const HEALTH_CATEGORY_STYLE = {
  healthy:  { bar: 'bg-emerald-500', text: 'text-emerald-400', label: 'Healthy'  },
  warning:  { bar: 'bg-amber-500',   text: 'text-amber-400',   label: 'Warning'  },
  critical: { bar: 'bg-red-500',     text: 'text-red-400',     label: 'Critical' },
}

function TempValue({ temp }) {
  const t = temp ?? 0
  const color =
    t >= 95 ? 'text-red-400'    :
    t >= 80 ? 'text-amber-400'  :
    t >= 50 ? 'text-orange-400' :
              'text-sky-400'
  return <span className={`font-bold tabular-nums ${color}`}>{t.toFixed(1)}°C</span>
}

function HealthBar({ score, category }) {
  const cat = HEALTH_CATEGORY_STYLE[category] || HEALTH_CATEGORY_STYLE.healthy
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400">Health</span>
        <span className={`font-semibold tabular-nums ${cat.text}`}>
          {score ?? 100}% &mdash; {cat.label}
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${cat.bar}`}
          style={{ width: `${score ?? 100}%` }}
        />
      </div>
    </div>
  )
}

function FailureRiskBadge({ risk, eta }) {
  if (!risk || risk <= 0) return null
  const pct = Math.round(risk * 100)
  const isHigh = pct >= 60
  const isMed  = pct >= 30

  const bg    = isHigh ? 'bg-red-500/15 border-red-500/40'    : isMed ? 'bg-amber-500/15 border-amber-500/40' : 'bg-yellow-500/15 border-yellow-500/30'
  const text  = isHigh ? 'text-red-400'  : isMed ? 'text-amber-400' : 'text-yellow-400'
  const icon  = isHigh ? '⚠' : '○'

  return (
    <div className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${bg}`}>
      <span className={`font-semibold flex items-center gap-1 ${text}`}>
        <span>{icon}</span>
        Failure Risk: {pct}%
      </span>
      {eta !== null && eta !== undefined && (
        <span className="text-gray-500 tabular-nums">~{eta} min</span>
      )}
    </div>
  )
}

export default function DeviceCard({ device }) {
  const selectedDeviceId    = useStore((s) => s.selectedDeviceId)
  const setSelectedDeviceId = useStore((s) => s.setSelectedDeviceId)
  const prediction          = useStore((s) => s.predictions[device.deviceId])

  const isSelected = selectedDeviceId === device.deviceId
  const border = STATUS_BORDER[device.status] || 'border-gray-700'
  const lastSeen = new Date(device.lastSeen).toLocaleTimeString()

  // Live prediction takes precedence over the snapshot value from the device object
  const failureRisk          = prediction?.failureRisk          ?? device.failureRisk          ?? 0
  const predictedFailureTime = prediction?.predictedFailureTime ?? device.predictedFailureTime ?? null

  return (
    <div
      onClick={() => setSelectedDeviceId(device.deviceId)}
      className={`
        relative bg-gray-800 rounded-xl border p-4 cursor-pointer select-none
        transition-all duration-200 hover:bg-gray-750 hover:scale-[1.01] hover:shadow-lg
        ${border}
        ${isSelected ? 'ring-2 ring-sky-500/70 ring-offset-2 ring-offset-gray-950' : ''}
        ${device._optimistic ? 'opacity-60 pointer-events-none' : ''}
        ${device.status === 'critical' ? 'shadow-red-900/20 shadow-md' : ''}
      `}
    >
      {device._optimistic && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {device.name || device.deviceId}
          </p>
          <p className="text-gray-500 text-xs font-mono truncate mt-0.5">
            {device.deviceId}
          </p>
        </div>
        <StatusBadge status={device.status} />
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Temperature</span>
          <TempValue temp={device.temperature} />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-400">Battery</span>
          </div>
          <BatteryBar level={device.batteryLevel} />
        </div>

        <HealthBar score={device.healthScore} category={device.healthCategory} />

        <FailureRiskBadge risk={failureRisk} eta={predictedFailureTime} />

        {/* Lifecycle state */}
        {device.lifecycleState && device.lifecycleState !== 'ACTIVE' && (
          <div className={`text-xs rounded px-2 py-1 text-center font-medium ${
            device.lifecycleState === 'FAILED'      ? 'bg-red-900/40 text-red-400' :
            device.lifecycleState === 'MAINTENANCE' ? 'bg-amber-900/40 text-amber-400' :
            'bg-gray-700 text-gray-400'
          }`}>
            {device.lifecycleState}
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Location</span>
          <span className="text-gray-400 font-mono">
            {device.location?.lat?.toFixed(3)},&nbsp;{device.location?.lng?.toFixed(3)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Last seen</span>
          <span className="text-gray-500">{lastSeen}</span>
        </div>
      </div>
    </div>
  )
}
