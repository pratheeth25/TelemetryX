
export default function BatteryBar({ value }) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const color =
    pct > 50 ? "bg-green-500" : pct > 20 ? "bg-yellow-400" : "bg-red-500";

  return (
    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}
