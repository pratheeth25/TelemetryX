import useStore from '../store/useStore'

const CATEGORY_COLOR = {
  mobile:   'bg-sky-500/15  text-sky-400  border-sky-500/20',
  laptop:   'bg-violet-500/15 text-violet-400 border-violet-500/20',
  wearable: 'bg-pink-500/15 text-pink-400  border-pink-500/20',
  tablet:   'bg-cyan-500/15  text-cyan-400  border-cyan-500/20',
  desktop:  'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  server:   'bg-orange-500/15 text-orange-400 border-orange-500/20',
  sensor:   'bg-teal-500/15  text-teal-400  border-teal-500/20',
  router:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  camera:   'bg-red-500/15   text-red-400   border-red-500/20',
  other:    'bg-gray-500/15  text-gray-400  border-gray-600/20',
}

function HealthBar({ score }) {
  const color =
    score >= 80 ? 'bg-emerald-500' :
    score >= 50 ? 'bg-amber-500'   :
                  'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs tabular-nums w-8 text-right ${
        score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
      }`}>{score}%</span>
    </div>
  )
}

function MetricPill({ label, value, valueClass }) {
  return (
    <div className="bg-gray-900 rounded-lg px-3 py-2 text-center">
      <p className={`text-base font-bold tabular-nums ${valueClass}`}>{value}</p>
      <p className="text-gray-600 text-[10px] mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  )
}

export default function ProductCard({ product }) {
  const setActiveProductId = useStore((s) => s.setActiveProductId)
  const devices = useStore((s) => s.devices)

  // Live metrics from in-memory devices (real-time, no round-trip needed)
  const productDevices = devices.filter((d) => d.productId === product.productId)
  const liveCount      = productDevices.length
  const avgTemp  = liveCount
    ? parseFloat((productDevices.reduce((a, d) => a + (d.temperature  || 0), 0) / liveCount).toFixed(1))
    : 0
  const avgBat   = liveCount
    ? parseFloat((productDevices.reduce((a, d) => a + (d.batteryLevel || 0), 0) / liveCount).toFixed(1))
    : 0
  const avgHealth = liveCount
    ? parseFloat((productDevices.reduce((a, d) => a + (d.healthScore  || 0), 0) / liveCount).toFixed(1))
    : 0
  const failedCount = productDevices.filter((d) => d.status === 'offline' || d.status === 'critical').length
  const failureRate = liveCount ? parseFloat(((failedCount / liveCount) * 100).toFixed(1)) : 0

  const catStyle = CATEGORY_COLOR[product.category] || CATEGORY_COLOR.other
  const releaseYear = product.releaseDate ? new Date(product.releaseDate).getFullYear() : '—'

  return (
    <div
      onClick={() => setActiveProductId(product.productId)}
      className="bg-gray-800 rounded-xl border border-gray-700 p-5 cursor-pointer
        hover:bg-gray-750 hover:border-gray-600 hover:scale-[1.01] hover:shadow-lg
        transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0 select-none">{product.imageEmoji || '📦'}</span>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate group-hover:text-sky-400 transition-colors">
              {product.name}
            </p>
            <p className="text-gray-600 text-xs mt-0.5">Released {releaseYear}</p>
          </div>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${catStyle} capitalize`}>
          {product.category}
        </span>
      </div>

      {/* Health score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500">Avg Health Score</span>
        </div>
        <HealthBar score={avgHealth} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricPill label="Temp" value={`${avgTemp}°`}
          valueClass={avgTemp >= 80 ? 'text-red-400' : avgTemp >= 60 ? 'text-amber-400' : 'text-sky-400'} />
        <MetricPill label="Battery" value={`${avgBat}%`}
          valueClass={avgBat <= 20 ? 'text-red-400' : avgBat <= 40 ? 'text-amber-400' : 'text-emerald-400'} />
        <MetricPill label="Fail Rate" value={`${failureRate}%`}
          valueClass={failureRate >= 50 ? 'text-red-400' : failureRate >= 20 ? 'text-amber-400' : 'text-emerald-400'} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs border-t border-gray-700/50 pt-3">
        <span className="text-gray-500">{liveCount} device{liveCount !== 1 ? 's' : ''}</span>
        <span className="text-sky-500 group-hover:text-sky-400 flex items-center gap-1">
          Drill down
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  )
}
