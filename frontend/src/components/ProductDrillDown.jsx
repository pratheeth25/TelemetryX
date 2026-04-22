import { useEffect, useState } from 'react'
import useStore from '../store/useStore'
import { getProductById } from '../services/api'
import DeviceCard from './DeviceCard'

function HealthBar({ score }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{score}%</span>
    </div>
  )
}

function StatBadge({ label, value, valueClass }) {
  return (
    <div className="bg-gray-900 rounded-xl px-4 py-3">
      <p className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</p>
      <p className="text-gray-600 text-xs mt-1 uppercase tracking-wide">{label}</p>
    </div>
  )
}

export default function ProductDrillDown() {
  const activeProductId    = useStore((s) => s.activeProductId)
  const setActiveProductId = useStore((s) => s.setActiveProductId)
  const devices            = useStore((s) => s.devices)

  const [product, setProduct]  = useState(null)
  const [loading, setLoading]  = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    if (!activeProductId) return
    setLoading(true)
    getProductById(activeProductId)
      .then(({ product }) => setProduct(product))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeProductId])

  // Live devices from store, filtered by product and sorted worst-first
  const productDevices = devices
    .filter((d) => d.productId === activeProductId)
    .sort((a, b) => (a.healthScore ?? 100) - (b.healthScore ?? 100))
  const filtered = statusFilter
    ? productDevices.filter((d) => d.status === statusFilter)
    : productDevices

  // Live aggregations
  const liveCount  = productDevices.length
  const avgTemp    = liveCount
    ? parseFloat((productDevices.reduce((a, d) => a + d.temperature,  0) / liveCount).toFixed(1)) : 0
  const avgBat     = liveCount
    ? parseFloat((productDevices.reduce((a, d) => a + d.batteryLevel, 0) / liveCount).toFixed(1)) : 0
  const avgHealth  = liveCount
    ? parseFloat((productDevices.reduce((a, d) => a + (d.healthScore || 0), 0) / liveCount).toFixed(1)) : 0
  const failedCount  = productDevices.filter((d) => d.status === 'offline' || d.status === 'critical').length
  const failureRate  = liveCount ? parseFloat(((failedCount / liveCount) * 100).toFixed(1)) : 0

  if (!activeProductId) return null

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => setActiveProductId(null)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-5 transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Products
      </button>

      {/* Product header */}
      {loading ? (
        <div className="h-16 flex items-center gap-2 text-gray-500">
          <span className="w-4 h-4 border-2 border-gray-600 border-t-sky-500 rounded-full animate-spin" />
          Loading product…
        </div>
      ) : product && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-5">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{product.imageEmoji || '📦'}</span>
              <div>
                <h2 className="text-white font-bold text-lg">{product.name}</h2>
                <p className="text-gray-500 text-xs mt-0.5 capitalize">
                  {product.category} · Released {new Date(product.releaseDate).getFullYear()}
                </p>
              </div>
            </div>

            {/* Live stat row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBadge label="Avg Temp"   value={`${avgTemp}°C`}
                valueClass={avgTemp >= 80 ? 'text-red-400' : avgTemp >= 60 ? 'text-amber-400' : 'text-sky-400'} />
              <StatBadge label="Avg Battery" value={`${avgBat}%`}
                valueClass={avgBat <= 20 ? 'text-red-400' : avgBat <= 40 ? 'text-amber-400' : 'text-emerald-400'} />
              <StatBadge label="Failure Rate" value={`${failureRate}%`}
                valueClass={failureRate >= 50 ? 'text-red-400' : failureRate >= 20 ? 'text-amber-400' : 'text-emerald-400'} />
              <div className="bg-gray-900 rounded-xl px-4 py-3">
                <p className="text-2xl font-bold text-white tabular-nums">{liveCount}</p>
                <p className="text-gray-600 text-xs mt-1 uppercase tracking-wide">Devices</p>
              </div>
            </div>
          </div>

          {/* Health bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
              <span>Fleet Health Score</span><span>{avgHealth}%</span>
            </div>
            <HealthBar score={avgHealth} />
          </div>
        </div>
      )}

      {/* Device filter + grid */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-white font-semibold">
          Devices
          <span className="ml-2 text-sm text-gray-500 font-normal">({filtered.length})</span>
        </h3>
        <div className="flex gap-2">
          {['', 'online', 'warning', 'critical', 'offline'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-600 text-sm py-8 text-center">No devices match the selected filter.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filtered.map((d) => <DeviceCard key={d.deviceId} device={d} />)}
        </div>
      )}
    </div>
  )
}
