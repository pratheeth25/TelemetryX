'use strict';

const eventLogService = require('../services/eventLogService');

/**
 * GET /api/events
 * Query params: deviceId, type, severity, limit, skip
 */
async function getEvents(req, res, next) {
  try {
    const { deviceId, type, severity, limit, skip } = req.query;
    const events = await eventLogService.getEvents({ deviceId, type, severity, limit, skip });
    res.json({ count: events.length, events });
  } catch (err) {
    next(err);
  }
}

module.exports = { getEvents };
