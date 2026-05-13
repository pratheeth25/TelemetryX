import StatusBadge from "./StatusBadge";
import BatteryBar from "./BatteryBar";
import useAuthStore from "../store/useAuthStore";
import { deviceApi } from "../services/api";
import useStore from "../store/useStore";

const TYPE_ICON = {
  smart_speaker:      "🔊", smart_lights:       "💡", smart_camera:       "📷",
  smart_door_lock:    "🔒", smart_tv:           "📺", robot_vacuum:       "🤖",
  smart_doorbell:     "🔔", smart_refrigerator: "🧊", sensor_motion:      "👁",
  sensor_smoke:       "💨", sensor_water:       "💧", sensor_air:         "🌬",
};

function MiniStat({ label, value, warn }) {
  return (
    <div className={`flex flex-col items-center p-1.5 rounded-lg ${warn ? "bg-red-900/30" : "bg-gray-800/60"}`}>
      <span className={`text-xs font-semibold ${warn ? "text-red-400" : "text-white"}`}>{value ?? "–"}</span>
      <span className="text-gray-600 text-[10px]">{label}</span>
    </div>
  );
}

export default function DeviceCard({ device, onSelect }) {
  const { name, location, type, status, temperature, battery, signalStrength, latency, packetLoss, enabled } = device;
  const { role } = useAuthStore();
  const setDeviceEnabled = useStore((s) => s.setDeviceEnabled);
  const canToggle = role === "admin" || role === "operator";

  async function handleToggle(e) {
    e.stopPropagation();
    setDeviceEnabled(device.deviceId, !enabled);
    try {
      await deviceApi.toggle(device.deviceId);
    } catch {
      setDeviceEnabled(device.deviceId, enabled);
    }
  }

  const tempWarn   = temperature >= 75;
  const battWarn   = battery <= 15;
  const signalWarn = signalStrength <= -80;
  const anyWarn    = tempWarn || battWarn || signalWarn;
  const isDisabled = enabled === false;

  const tempColor =
    temperature >= 75 ? "text-red-400" :
    temperature >= 55 ? "text-amber-400" : "text-emerald-400";

  return (
    <div
      onClick={() => onSelect(device)}
      className={`group relative bg-gray-900 border rounded-2xl p-4 cursor-pointer transition-all duration-200
        hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5
        ${anyWarn && !isDisabled ? "border-amber-500/30" : "border-gray-800"}
        ${status === "offline" || isDisabled ? "opacity-60" : ""}
      `}
    >
      {/* Offline overlay indicator */}
      {status === "offline" && !isDisabled && (
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
      )}

      {/* Disabled badge */}
      {isDisabled && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400 font-medium">OFF</span>
        </div>
      )}

      {/* Header: icon + name + badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl leading-none mt-0.5">{TYPE_ICON[type] ?? "📡"}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">{name}</h3>
          <p className="text-gray-500 text-xs mt-0.5 truncate">{location}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Temperature big display */}
      <div className="flex items-end gap-1 mb-3">
        <span className={`text-3xl font-bold tabular-nums ${tempColor}`}>
          {temperature != null ? temperature.toFixed(1) : "--"}
        </span>
        <span className="text-gray-500 text-sm mb-1">°C</span>
        {tempWarn && <span className="text-red-400 text-xs mb-1 ml-1">⚠</span>}
      </div>

      {/* Battery */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className={battWarn ? "text-red-400" : "text-gray-500"}>Battery</span>
          <span className={`font-medium ${battWarn ? "text-red-400" : "text-gray-300"}`}>
            {battery != null ? `${battery.toFixed(0)}%` : "--"}
          </span>
        </div>
        <BatteryBar value={battery} />
      </div>

      {/* Network mini-stats */}
      <div className="grid grid-cols-3 gap-1.5">
        <MiniStat label="Signal" value={signalStrength != null ? `${signalStrength}dBm` : "–"} warn={signalWarn} />
        <MiniStat label="Latency" value={latency != null ? `${latency}ms` : "–"} warn={latency > 200} />
        <MiniStat label="Loss" value={packetLoss != null ? `${packetLoss}%` : "–"} warn={packetLoss > 10} />
      </div>

      {/* Power toggle — admin / operator only */}
      {canToggle && (
        <button
          onClick={handleToggle}
          className={`mt-3 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all
            ${isDisabled
              ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30"
              : "bg-gray-800 text-gray-400 hover:bg-red-900/30 hover:text-red-400 border border-gray-700"
            }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>
          </svg>
          {isDisabled ? "Turn On" : "Turn Off"}
        </button>
      )}
    </div>
  );
}
