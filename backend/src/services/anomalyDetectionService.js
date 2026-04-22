'use strict';

const internalEmitter = require('../events/eventEmitter');
const eventLogService = require('./eventLogService');
const thresholds = require('../config/thresholds');

/**
 * AnomalyDetectionService
 *
 * Listens for DEVICE_UPDATE events, evaluates thresholds, and emits
 * ANOMALY_DETECTED events (with cooldown suppression to avoid spam).
 */
class AnomalyDetectionService {
  constructor() {
    /** Map<`${deviceId}:${type}`, timestamp> – last time an alert was emitted */
    this._lastAlertAt = new Map();
  }

  start() {
    internalEmitter.on(internalEmitter.DEVICE_UPDATE, (device) => {
      this._evaluate(device);
    });
    console.log('[AnomalyDetection] Service started.');
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  _evaluate(device) {
    const { deviceId, temperature, batteryLevel, status } = device;

    // Temperature anomalies
    if (temperature >= thresholds.temperature.critical) {
      this._emitIfReady(deviceId, 'CRITICAL_TEMPERATURE', 'critical',
        `Device ${deviceId} has CRITICAL temperature: ${temperature}°C`);
    } else if (temperature >= thresholds.temperature.high) {
      this._emitIfReady(deviceId, 'HIGH_TEMPERATURE', 'warning',
        `Device ${deviceId} has high temperature: ${temperature}°C`);
    }

    // Battery anomalies
    if (batteryLevel <= thresholds.battery.critical) {
      this._emitIfReady(deviceId, 'CRITICAL_BATTERY', 'critical',
        `Device ${deviceId} has CRITICAL battery: ${batteryLevel}%`);
    } else if (batteryLevel <= thresholds.battery.low) {
      this._emitIfReady(deviceId, 'LOW_BATTERY', 'warning',
        `Device ${deviceId} has low battery: ${batteryLevel}%`);
    }

    // Offline check
    if (status === 'offline') {
      this._emitIfReady(deviceId, 'DEVICE_OFFLINE', 'critical',
        `Device ${deviceId} is offline.`);
    }
  }

  _emitIfReady(deviceId, type, severity, message) {
    const key = `${deviceId}:${type}`;
    const now = Date.now();
    const lastAt = this._lastAlertAt.get(key) || 0;

    if (now - lastAt < thresholds.anomalyCooldownMs) {
      return; // still in cooldown
    }

    this._lastAlertAt.set(key, now);

    const payload = { deviceId, type, severity, message, timestamp: new Date() };

    // Persist async – do not block the event loop
    eventLogService.log(payload).catch((err) => {
      console.error('[AnomalyDetection] Failed to log event:', err.message);
    });

    internalEmitter.emit(internalEmitter.ANOMALY_DETECTED, payload);
  }
}

module.exports = new AnomalyDetectionService();
