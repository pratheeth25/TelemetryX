'use strict';

const Event = require('../models/Event');

/**
 * EventLogService
 *
 * Persists anomaly / lifecycle events to MongoDB and exposes
 * query helpers for the REST API.
 */
class EventLogService {
  /**
   * Persist a new event.
   * @param {{ deviceId, type, severity, message, timestamp? }} data
   * @returns {Promise<Event>}
   */
  async log({ deviceId, type, severity, message, timestamp }) {
    const event = new Event({
      deviceId,
      type,
      severity,
      message,
      timestamp: timestamp || new Date(),
    });
    return event.save();
  }

  /**
   * Retrieve events with optional filters.
   * @param {{ deviceId?, type?, severity?, limit?, skip? }} options
   * @returns {Promise<Event[]>}
   */
  async getEvents({ deviceId, type, severity, limit = 100, skip = 0 } = {}) {
    const filter = {};
    if (deviceId) filter.deviceId = deviceId;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    return Event.find(filter)
      .sort({ timestamp: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();
  }
}

module.exports = new EventLogService();
