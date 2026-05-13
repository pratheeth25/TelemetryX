import StatusBadge from "./StatusBadge";
import TelemetryChart from "./TelemetryChart";
import BatteryBar from "./BatteryBar";

export default function DeviceDetail({ device, onClose }) {
  if (!device) return null;

  const { name, location, type, status, temperature, battery, signalStrength, latency, packetLoss, deviceId } = device;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-gray-900 w-full max-w-lg h-full overflow-y-auto p-6 border-l border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-white text-xl font-bold">{name}</h2>
            <p className="text-gray-400 text-sm">{location} · {type}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
          </div>
        </div>

        {/* Live metrics grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <MetricBox label="Temperature" value={`${temperature?.toFixed(1) ?? "--"}°C`}
            color={temperature >= 75 ? "text-red-400" : temperature >= 60 ? "text-yellow-400" : "text-green-400"} />
          <MetricBox label="Latency"  value={`${latency ?? "--"} ms`}     color="text-blue-400" />
          <MetricBox label="Signal"   value={`${signalStrength ?? "--"} dBm`} color="text-purple-400" />
          <MetricBox label="Pkt Loss" value={`${packetLoss ?? "--"}%`}    color="text-orange-400" />
        </div>

        {/* Battery */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Battery</span>
            <span>{battery?.toFixed(0) ?? "--"}%</span>
          </div>
          <BatteryBar value={battery} />
        </div>

        {/* Charts */}
        <TelemetryChart deviceId={deviceId} />
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
    </div>
  );
}
