import { useDevices } from '../hooks/useDevices'
import useStore from '../store/useStore'

function StatCard({ label, value, sub, valueClass }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 px-5 py-4">
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1.5 tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function StatsRow() {
  const { devices } = useDevices()
  const events   = useStore((s) => s.events)
  const products = useStore((s) => s.products)
  const orgs     = useStore((s) => s.orgs)

  const online   = devices.filter((d) => d.status === 'online').length
  const warning  = devices.filter((d) => d.status === 'warning').length
  const critical = devices.filter((d) => d.status === 'critical' || d.status === 'offline').length
  const criticalEvents = events.filter((e) => e.severity === 'critical').length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <StatCard label="Organisations"   value={orgs.length}     sub="tenants"            valueClass="text-violet-400" />
      <StatCard label="Products"        value={products.length} sub="in catalogue"       valueClass="text-sky-400"    />
      <StatCard label="Total Devices"   value={devices.length}  sub="registered"         valueClass="text-white"      />
      <StatCard label="Online"          value={online}          sub="responding normally" valueClass="text-emerald-400" />
      <StatCard label="Warnings"        value={warning}         sub="need attention"      valueClass="text-amber-400"  />
      <StatCard label="Critical/Offline" value={critical}       sub={`${criticalEvents} critical events`} valueClass="text-red-400" />
    </div>
  )
}
