'use strict';

/**
 * Config-based thresholds for anomaly detection.
 * All values can be overridden via environment variables.
 */
module.exports = Object.freeze({
  temperature: {
    /** Emit a WARNING anomaly above this value (°C) */
    high: parseFloat(process.env.THRESHOLD_TEMP_HIGH) || 80,
    /** Emit a CRITICAL anomaly above this value (°C) */
    critical: parseFloat(process.env.THRESHOLD_TEMP_CRITICAL) || 95,
  },
  battery: {
    /** Emit a WARNING anomaly below this value (%) */
    low: parseFloat(process.env.THRESHOLD_BATTERY_LOW) || 20,
    /** Emit a CRITICAL anomaly below this value (%) */
    critical: parseFloat(process.env.THRESHOLD_BATTERY_CRITICAL) || 10,
  },
  /** Mark device offline after this many ms without an update */
  offlineTimeoutMs: parseInt(process.env.THRESHOLD_OFFLINE_MS, 10) || 15_000,
  /** Minimum ms between repeated alerts for the same device + anomaly type */
  anomalyCooldownMs: parseInt(process.env.ANOMALY_COOLDOWN_MS, 10) || 30_000,
});
