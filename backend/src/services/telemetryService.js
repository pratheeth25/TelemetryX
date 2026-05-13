const Device = require("../models/Device");
const Telemetry = require("../models/Telemetry");
const Alert = require("../models/Alert");

const THRESHOLDS = {
  HIGH_TEMP: 75,
  LOW_BATTERY: 20,
};

async function checkAlerts(device, telemetry) {
  const { deviceId, name, houseId } = device;
  const { temperature, battery, status } = telemetry;

  const existing = await Alert.find({ deviceId, acknowledged: false }).select("type");
  const existingTypes = new Set(existing.map((a) => a.type));

  const newAlerts = [];

  if (temperature >= THRESHOLDS.HIGH_TEMP && !existingTypes.has("HIGH_TEMP")) {
    newAlerts.push({
      houseId, deviceId, deviceName: name,
      type: "HIGH_TEMP",
      message: `${name}: High temperature detected (${temperature.toFixed(1)}°C)`,
      severity: "critical",
    });
  }

  if (battery <= THRESHOLDS.LOW_BATTERY && !existingTypes.has("LOW_BATTERY")) {
    newAlerts.push({
      houseId, deviceId, deviceName: name,
      type: "LOW_BATTERY",
      message: `${name}: Low battery (${battery.toFixed(0)}%)`,
      severity: "warning",
    });
  }

  if (status === "offline" && !existingTypes.has("DEVICE_OFFLINE")) {
    newAlerts.push({
      houseId, deviceId, deviceName: name,
      type: "DEVICE_OFFLINE",
      message: `${name}: Device went offline`,
      severity: "critical",
    });
  }

  if (status === "online" && existingTypes.has("DEVICE_OFFLINE")) {
    await Alert.deleteMany({ deviceId, type: "DEVICE_OFFLINE" });
  }

  if (newAlerts.length > 0) {
    await Alert.insertMany(newAlerts);
  }

  return newAlerts;
}

async function saveTelemetry(deviceId, data, houseId) {
  const { temperature, battery, signalStrength, latency, packetLoss, status } = data;

  await Device.findOneAndUpdate(
    { deviceId },
    {
      status,
      "telemetry.temperature": temperature,
      "telemetry.battery": battery,
      "telemetry.signalStrength": signalStrength,
      "telemetry.latency": latency,
      "telemetry.packetLoss": packetLoss,
      "telemetry.updatedAt": new Date(),
    }
  );

  await Telemetry.create({ houseId, deviceId, temperature, battery, signalStrength, latency, packetLoss, status });

  const oldest = await Telemetry.find({ deviceId })
    .sort({ createdAt: -1 })
    .skip(200)
    .select("_id");
  if (oldest.length > 0) {
    await Telemetry.deleteMany({ _id: { $in: oldest.map((d) => d._id) } });
  }
}

module.exports = { checkAlerts, saveTelemetry };
