'use strict';

const { randomUUID } = require('crypto');
const Alert = require('../models/Alert');
const internalEmitter = require('../events/eventEmitter');
const thresholds = require('../config/thresholds');

/**
 * AlertService
 *
 * Evaluates alert rules against each device tick, deduplicates open alerts,
 * and auto-resolves them when the triggering condition normalises.
 *
 * Rule catalogue
 * ──────────────
 *  TEMP_HIGH        temperature ≥ thresholds.temperature.high
 *  TEMP_CRITICAL    temperature ≥ thresholds.temperature.critical
 *  BATTERY_LOW      batteryLevel ≤ thresholds.battery.low
 *  BATTERY_CRITICAL batteryLevel ≤ thresholds.battery.critical
 *  DEVICE_OFFLINE   status === 'offline'
 *
 * Alert lifecycle
 * ───────────────
 *  open → acknowledged (via API) → resolved (auto or via API)
 *  open → resolved (auto-resolve when condition normalises)
 */

// ── Rule definitions ──────────────────────────────────────────────────────────

const RULES = [
  {
    ruleId:    'TEMP_CRITICAL',
    severity:  'critical',
    test:      (d) => d.temperature >= thresholds.temperature.critical,
    message:   (d) => `Critical temperature: ${d.temperature.toFixed(1)}°C (threshold: ${thresholds.temperature.critical}°C)`,
    resolveIf: (d) => d.temperature < thresholds.temperature.high,
  },
  {
    ruleId:    'TEMP_HIGH',
    severity:  'warning',
    test:      (d) => d.temperature >= thresholds.temperature.high && d.temperature < thresholds.temperature.critical,
    message:   (d) => `High temperature: ${d.temperature.toFixed(1)}°C (threshold: ${thresholds.temperature.high}°C)`,
    resolveIf: (d) => d.temperature < thresholds.temperature.high,
  },
  {
    ruleId:    'BATTERY_CRITICAL',
    severity:  'critical',
    test:      (d) => d.batteryLevel <= thresholds.battery.critical,
    message:   (d) => `Critical battery: ${d.batteryLevel.toFixed(1)}% (threshold: ${thresholds.battery.critical}%)`,
    resolveIf: (d) => d.batteryLevel > thresholds.battery.low,
  },
  {
    ruleId:    'BATTERY_LOW',
    severity:  'warning',
    test:      (d) => d.batteryLevel <= thresholds.battery.low && d.batteryLevel > thresholds.battery.critical,
    message:   (d) => `Low battery: ${d.batteryLevel.toFixed(1)}% (threshold: ${thresholds.battery.low}%)`,
    resolveIf: (d) => d.batteryLevel > thresholds.battery.low,
  },
  {
    ruleId:    'DEVICE_OFFLINE',
    severity:  'critical',
    test:      (d) => d.status === 'offline',
    message:   (d) => `Device ${d.deviceId} is offline`,
    resolveIf: (d) => d.status !== 'offline',
  },
];

// ── AlertService ──────────────────────────────────────────────────────────────

class AlertService {
  /**
   * Evaluate all rules for the given device state. Triggers new alerts and
   * auto-resolves stale ones. Fire-and-forget (returns void).
   *
   * @param {object} device  Live device state from the simulation tick
   */
  evaluate(device) {
    this._runRules(device).catch((err) =>
      console.error('[AlertService] evaluate error:', err.message)
    );
  }

  // ── API helpers (used by controllers) ──────────────────────────────────────

  /**
   * Fetch all non-resolved alerts, newest first. Optionally filter by deviceId.
   */
  static getOpenAlerts({ deviceId, severity, limit = 200 } = {}) {
    const filter = { state: { $ne: 'resolved' } };
    if (deviceId) filter.deviceId = deviceId;
    if (severity) filter.severity = severity;
    return Alert.find(filter).sort({ triggeredAt: -1 }).limit(limit).lean();
  }

  /**
   * Fetch all alerts for a device (including resolved), newest first.
   */
  static getAlertsForDevice(deviceId, { limit = 100 } = {}) {
    return Alert.find({ deviceId }).sort({ triggeredAt: -1 }).limit(limit).lean();
  }

  /**
   * Acknowledge an open alert.
   * @param {string} alertId
   * @param {string} [acknowledgedBy]
   */
  static async acknowledgeAlert(alertId, acknowledgedBy = 'user') {
    const alert = await Alert.findOneAndUpdate(
      { alertId, state: 'open' },
      { state: 'acknowledged', acknowledgedAt: new Date(), acknowledgedBy },
      { new: true }
    );
    if (!alert) throw Object.assign(new Error('Alert not found or already acknowledged'), { status: 404 });
    return alert;
  }

  /**
   * Manually resolve an alert.
   * @param {string} alertId
   */
  static async resolveAlert(alertId) {
    const alert = await Alert.findOneAndUpdate(
      { alertId, state: { $ne: 'resolved' } },
      { state: 'resolved', resolvedAt: new Date() },
      { new: true }
    );
    if (!alert) throw Object.assign(new Error('Alert not found or already resolved'), { status: 404 });
    return alert;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async _runRules(device) {
    for (const rule of RULES) {
      if (rule.test(device)) {
        await this._triggerIfNew(device, rule);
      } else {
        await this._resolveIfOpen(device.deviceId, rule);
      }
    }
  }

  async _triggerIfNew(device, rule) {
    // Dedup: only one open alert per device+rule
    const existing = await Alert.findOne({
      deviceId: device.deviceId,
      ruleId:   rule.ruleId,
      state:    { $in: ['open', 'acknowledged'] },
    }).lean();

    if (existing) return; // already open, do not duplicate

    const alertId = randomUUID();
    const payload = {
      alertId,
      deviceId:     device.deviceId,
      ruleId:       rule.ruleId,
      severity:     rule.severity,
      message:      rule.message(device),
      state:        'open',
      triggeredAt:  new Date(),
      triggerValue: {
        temperature:  device.temperature,
        batteryLevel: device.batteryLevel,
        status:       device.status,
      },
    };

    await Alert.create(payload);
    internalEmitter.emit(internalEmitter.ALERT_TRIGGERED, payload);
  }

  async _resolveIfOpen(deviceId, rule) {
    const alert = await Alert.findOneAndUpdate(
      { deviceId, ruleId: rule.ruleId, state: { $in: ['open', 'acknowledged'] } },
      { state: 'resolved', resolvedAt: new Date() },
      { new: true }
    );
    if (alert) {
      internalEmitter.emit(internalEmitter.ALERT_RESOLVED, alert.toObject());
    }
  }
}

module.exports = new AlertService();
