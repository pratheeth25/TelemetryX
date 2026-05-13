const Alert = require("../models/Alert");

async function getAlerts(req, res) {
  try {
    const houseId = req.user?.houseId;
    const filter  = houseId ? { houseId } : {};
    const alerts  = await Alert.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function acknowledgeAlert(req, res) {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, houseId: req.user.houseId },
      { acknowledged: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAlerts, acknowledgeAlert };
