const Telemetry = require("../models/Telemetry");

async function getRecentTelemetry(req, res) {
  try {
    const data = await Telemetry.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getRecentTelemetry };
