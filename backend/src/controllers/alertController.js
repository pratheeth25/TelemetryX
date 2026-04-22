'use strict';

const AlertService = require('../services/alertService');
const Alert = require('../models/Alert');

/**
 * GET /api/alerts
 * Query params: state (open|acknowledged|resolved), deviceId, severity
 */
async function getAlerts(req, res, next) {
  try {
    const { state, deviceId, severity, limit } = req.query;
    const filter = {};
    if (state) filter.state = state;
    if (deviceId) filter.deviceId = deviceId;
    if (severity) filter.severity = severity;

    const query = Alert.find(filter)
      .sort({ triggeredAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 200, 500));

    const alerts = await query.lean();
    res.json({ count: alerts.length, alerts });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/alerts/stats
 * Returns counts grouped by state and severity.
 */
async function getAlertStats(req, res, next) {
  try {
    const [bySeverity, byState] = await Promise.all([
      Alert.aggregate([
        { $match: { state: { $ne: 'resolved' } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $group: { _id: '$state', count: { $sum: 1 } } },
      ]),
    ]);

    const severity = Object.fromEntries(bySeverity.map((r) => [r._id, r.count]));
    const stateMap = Object.fromEntries(byState.map((r) => [r._id, r.count]));

    res.json({ severity, state: stateMap });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/alerts/:id/acknowledge
 * Body: { acknowledgedBy }
 */
async function acknowledgeAlert(req, res, next) {
  try {
    const { id } = req.params;
    const { acknowledgedBy = 'user' } = req.body;
    const alert = await AlertService.acknowledgeAlert(id, String(acknowledgedBy).slice(0, 100));
    res.json({ alert });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

/**
 * POST /api/alerts/:id/resolve
 */
async function resolveAlert(req, res, next) {
  try {
    const { id } = req.params;
    const alert = await AlertService.resolveAlert(id);
    res.json({ alert });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

module.exports = { getAlerts, getAlertStats, acknowledgeAlert, resolveAlert };
