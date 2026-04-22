'use strict';

const internalEmitter = require('../events/eventEmitter');

/**
 * ObservabilityService
 *
 * Tracks system-level metrics in memory using rolling time windows:
 *  - events per second  (last 60 s)
 *  - anomalies per minute (last 5 min)
 *  - active devices     (from simulation service snapshot)
 *  - uptime             (process uptime)
 *
 * Accessed via GET /metrics and also polled by the frontend dashboard.
 */

const WINDOW_1MIN  = 60_000;
const WINDOW_5MIN  = 5 * 60_000;

class ObservabilityService {
  constructor() {
    /** ISO timestamps of every internal event emitted */
    this._eventTs    = [];   // for events/sec
    /** ISO timestamps of every anomaly detected */
    this._anomalyTs  = [];   // for anomalies/min
    /** Snapshot of active device count (set externally each tick) */
    this._activeDevices = 0;
    /** Process start time */
    this._startedAt = Date.now();

    this._bindListeners();
  }

  _bindListeners() {
    // Count every internal domain event
    const countEvent = () => this._eventTs.push(Date.now());
    internalEmitter.on(internalEmitter.DEVICE_UPDATE,        countEvent);
    internalEmitter.on(internalEmitter.DEVICE_STATUS_CHANGE, countEvent);

    // Count anomalies separately for anomalies/min
    internalEmitter.on(internalEmitter.ANOMALY_DETECTED, () => {
      this._eventTs.push(Date.now());
      this._anomalyTs.push(Date.now());
    });

    // Also count alert + lifecycle events
    internalEmitter.on(internalEmitter.ALERT_TRIGGERED,  countEvent);
    internalEmitter.on(internalEmitter.LIFECYCLE_CHANGE, countEvent);
  }

  /** Called each simulation tick to keep active-device count current */
  setActiveDevices(count) {
    this._activeDevices = count;
  }

  /** Returns the current metrics snapshot */
  getMetrics(networkService) {
    const now = Date.now();

    // Prune stale entries
    this._eventTs   = this._eventTs.filter((t) => t > now - WINDOW_1MIN);
    this._anomalyTs = this._anomalyTs.filter((t) => t > now - WINDOW_5MIN);

    const eventsPerSecond    = parseFloat((this._eventTs.length / (WINDOW_1MIN / 1000)).toFixed(3));
    const anomaliesPerMinute = parseFloat((this._anomalyTs.filter((t) => t > now - WINDOW_1MIN).length).toFixed(0));
    const uptimeSec          = Math.floor((now - this._startedAt) / 1000);

    const network = networkService ? networkService.getMetrics() : null;

    return {
      timestamp:        new Date().toISOString(),
      uptimeSec,
      activeDevices:    this._activeDevices,
      eventsPerSecond,
      anomaliesPerMinute: Number(anomaliesPerMinute),
      network,
      process: {
        heapUsedMb:  parseFloat((process.memoryUsage().heapUsed / 1_048_576).toFixed(2)),
        rss_mb:      parseFloat((process.memoryUsage().rss      / 1_048_576).toFixed(2)),
        uptimeSec,
      },
    };
  }
}

module.exports = new ObservabilityService();
