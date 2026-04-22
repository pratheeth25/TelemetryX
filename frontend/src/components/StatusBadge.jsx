const CONFIG = {
  online:   { wrap: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', pulse: true,  label: 'Online'   },
  warning:  { wrap: 'bg-amber-500/10  text-amber-400  border-amber-500/20',  dot: 'bg-amber-500',  pulse: false, label: 'Warning'  },
  critical: { wrap: 'bg-red-500/10    text-red-400    border-red-500/20',    dot: 'bg-red-500',    pulse: false, label: 'Critical' },
  offline:  { wrap: 'bg-gray-600/20   text-gray-400   border-gray-600/30',   dot: 'bg-gray-500',   pulse: false, label: 'Offline'  },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG.offline
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.wrap}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  )
}
