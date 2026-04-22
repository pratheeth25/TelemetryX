export default function BatteryBar({ level }) {
  const pct = Math.min(100, Math.max(0, level ?? 0))
  const color =
    pct > 50 ? 'bg-emerald-500' :
    pct > 20 ? 'bg-amber-500'   :
               'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs w-9 text-right tabular-nums ${
        pct > 50 ? 'text-emerald-400' : pct > 20 ? 'text-amber-400' : 'text-red-400'
      }`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}
