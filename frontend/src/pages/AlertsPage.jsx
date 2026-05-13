import useStore from "../store/useStore";
import { acknowledgeAlert as ackApi } from "../services/api";

const SEVERITY_STYLES = {
  critical: "border-red-500/40 bg-red-500/10",
  warning:  "border-yellow-500/40 bg-yellow-500/10",
};

const TYPE_LABELS = {
  HIGH_TEMP:      { label: "High Temperature", icon: "🌡️" },
  LOW_BATTERY:    { label: "Low Battery",       icon: "🔋" },
  DEVICE_OFFLINE: { label: "Device Offline",    icon: "📡" },
};

export default function AlertsPage() {
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

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-white text-xl font-bold mb-4">All Alerts</h1>

      {alerts.length === 0 && (
        <p className="text-gray-500 text-center mt-20">No alerts yet.</p>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => {
          const meta = TYPE_LABELS[alert.type] || { label: alert.type, icon: "⚠️" };
          return (
            <div
              key={alert._id}
              className={`border rounded-xl p-4 transition-opacity ${
                SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.warning
              } ${alert.acknowledged ? "opacity-40" : ""}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-medium text-sm">
                    {meta.icon} {meta.label}
                  </p>
                  <p className="text-gray-300 text-sm mt-0.5">{alert.message}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      alert.severity === "critical"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {alert.severity}
                  </span>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAck(alert._id)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-lg"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
