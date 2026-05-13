import useStore from "../store/useStore";
import { acknowledgeAlert as ackApi } from "../services/api";

const SEVERITY_STYLES = {
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
  warning:  "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
};

const TYPE_ICONS = {
  HIGH_TEMP:      "🌡️",
  LOW_BATTERY:    "🔋",
  DEVICE_OFFLINE: "📡",
};

export default function AlertPanel() {
  const alerts = useStore((s) => s.alerts);
  const acknowledgeAlert = useStore((s) => s.acknowledgeAlert);

  async function handleAck(id) {
    try {
      await ackApi(id);
      acknowledgeAlert(id);
    } catch (e) {
      console.error(e);
    }
  }

  const active = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold">Alerts</h2>
        {active.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {active.length}
          </span>
        )}
      </div>

      {alerts.length === 0 && (
        <p className="text-gray-500 text-sm text-center mt-6">No alerts</p>
      )}

      <div className="space-y-2 overflow-y-auto max-h-80">
        {alerts.map((alert) => (
          <div
            key={alert._id}
            className={`border rounded-lg p-3 text-sm transition-opacity ${
              SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.warning
            } ${alert.acknowledged ? "opacity-40" : ""}`}
          >
            <div className="flex justify-between items-start gap-2">
              <span>
                {TYPE_ICONS[alert.type] || "⚠️"} {alert.message}
              </span>
              {!alert.acknowledged && (
                <button
                  onClick={() => handleAck(alert._id)}
                  className="text-xs text-gray-400 hover:text-white whitespace-nowrap"
                >
                  Ack
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(alert.createdAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
