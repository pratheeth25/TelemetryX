'use strict';

const lifecycleService = require('../services/lifecycleService');

/**
 * PATCH /api/devices/:id/lifecycle
 * Body: { state, reason }
 */
async function setLifecycleState(req, res, next) {
  try {
    const deviceId = req.params.id;
    const { state, reason = '' } = req.body;

    if (!state) {
      return res.status(400).json({ error: 'state is required in request body.' });
    }

    const device = await lifecycleService.transition(
      deviceId,
      String(state).toUpperCase(),
      String(reason).slice(0, 300),
      'manual'
    );

    res.json({ deviceId, lifecycleState: device.lifecycleState });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

/**
 * GET /api/devices/:id/lifecycle/history
 */
async function getLifecycleHistory(req, res, next) {
  try {
    const deviceId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const history = await lifecycleService.constructor.getHistory(deviceId, limit);
    res.json({ deviceId, count: history.length, history });
  } catch (err) {
    next(err);
  }
}

module.exports = { setLifecycleState, getLifecycleHistory };
