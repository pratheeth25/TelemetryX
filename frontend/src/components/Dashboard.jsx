import { Suspense, lazy } from 'react'
import Header from './Header'
import StatsRow from './StatsRow'
import ProductGrid from './ProductGrid'
import ProductDrillDown from './ProductDrillDown'
import NetworkHealthPanel from './NetworkHealthPanel'
import SystemHealthDashboard from './SystemHealthDashboard'
import EventLog from './EventLog'
import AlertPanel from './AlertPanel'
import DeviceLifecycleTimeline from './DeviceLifecycleTimeline'
import MapView from './MapView'
import useStore from '../store/useStore'
import { useProducts } from '../hooks/useProducts'

const TemperatureChart = lazy(() => import('./TemperatureChart'))

export default function Dashboard() {
  // Boot product/org data
  useProducts()

  const activeProductId = useStore((s) => s.activeProductId)
  const selectedDeviceId = useStore((s) => s.selectedDeviceId)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header />

      <main className="flex-1 px-4 sm:px-6 py-6 space-y-6 max-w-[1800px] mx-auto w-full">

        {/* ── Stats row ──────────────────────────────────── */}
        <StatsRow />

        {/* ── Main 2-column grid ─────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* Left: product grid OR drill-down */}
          {activeProductId ? <ProductDrillDown /> : <ProductGrid />}

          {/* Right: network + alerts + log */}
          <div className="flex flex-col gap-6">
            <SystemHealthDashboard />
            <NetworkHealthPanel />
            <AlertPanel />
            <EventLog />
          </div>
        </div>

        {/* ── Bottom: chart + map ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={
            <div className="bg-gray-800 rounded-xl border border-gray-700 h-64 flex items-center justify-center text-gray-600 text-sm">
              Loading chart…
            </div>
          }>
            <TemperatureChart />
          </Suspense>
          <MapView />
        </div>

        {/* ── Lifecycle timeline (appears when a device is selected) ── */}
        {selectedDeviceId && (
          <DeviceLifecycleTimeline deviceId={selectedDeviceId} />
        )}

      </main>
    </div>
  )
}
