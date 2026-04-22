'use strict';

/**
 * HealthScoreService
 *
 * Computes a 0-100 composite health score for a device from four
 * normalised metrics, each weighted independently:
 *
 *   ┌──────────────────────┬────────┐
 *   │ Metric               │ Weight │
 *   ├──────────────────────┼────────┤
 *   │ Temperature          │  35 %  │
 *   │ Battery level        │  30 %  │
 *   │ Last-seen latency    │  20 %  │
 *   │ Anomaly frequency    │  15 %  │
 *   └──────────────────────┴────────┘
 *
 * Categories:
 *   80 – 100  → healthy
 *   50 – 79   → warning
 *    0 – 49   → critical
 */

const WEIGHTS = Object.freeze({
  temperature: 0.35,
  battery:     0.30,
  latency:     0.20,
  anomaly:     0.15,
});

/** Temperature below which no penalty is applied (°C). */
const TEMP_BASELINE   = 40;
/** Temperature at which the full penalty is applied (°C). */
const TEMP_MAX        = 120;

/** Maximum number of anomalies in the window before the metric hits zero. */
const MAX_ANOMALIES   = 10;

/** Width of the anomaly sliding window (ms). */
const ANOMALY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns a 0-1 temperature component (1 = perfect, 0 = worst).
 * No penalty below TEMP_BASELINE; linear decrease to TEMP_MAX.
 * @param {number} temp  Current temperature in °C
 */
function _tempComponent(temp) {
  return 1 - Math.max(0, Math.min(1, (temp - TEMP_BASELINE) / (TEMP_MAX - TEMP_BASELINE)));
}

/**
 * Returns a 0-1 battery component (1 = 100 %, 0 = 0 %).
 * @param {number} battery  Battery percentage 0–100
 */
function _batteryComponent(battery) {
  return Math.max(0, Math.min(1, battery / 100));
}

/**
 * Returns a 0-1 latency component (1 = just seen, 0 = offline timeout reached).
 * @param {number} msSinceLastSeen   Elapsed ms since the device last responded
 * @param {number} offlineTimeoutMs  Threshold after which device is considered offline
 */
function _latencyComponent(msSinceLastSeen, offlineTimeoutMs) {
  if (offlineTimeoutMs <= 0) return 0;
  return Math.max(0, 1 - msSinceLastSeen / offlineTimeoutMs);
}

/**
 * Returns a 0-1 anomaly component (1 = no recent anomalies, 0 = MAX_ANOMALIES or more).
 * @param {number} recentCount  Anomaly events within the sliding window
 */
function _anomalyComponent(recentCount) {
  return Math.max(0, 1 - recentCount / MAX_ANOMALIES);
}

/**
 * Prunes timestamps older than the window from an anomaly tracking array.
 * Mutates the array in-place for efficiency.
 * @param {number[]} timestamps  Array of epoch-ms anomaly timestamps
 * @returns {number[]} The pruned array (same reference)
 */
function pruneAnomalyWindow(timestamps) {
  const cutoff = Date.now() - ANOMALY_WINDOW_MS;
  let i = 0;
  while (i < timestamps.length && timestamps[i] < cutoff) i++;
  if (i > 0) timestamps.splice(0, i);
  return timestamps;
}

/**
 * Computes the composite health score.
 *
 * @param {object} params
 * @param {number} params.temperature        Current temperature (°C)
 * @param {number} params.batteryLevel       Battery percentage (0–100)
 * @param {number} params.msSinceLastSeen    Ms since the device last responded
 * @param {number} params.recentAnomalyCount Anomaly events in the sliding window
 * @param {number} params.offlineTimeoutMs   Offline threshold in ms (default 15 000)
 * @returns {{ score: number, category: 'healthy'|'warning'|'critical', components: object }}
 */
function computeScore({
  temperature,
  batteryLevel,
  msSinceLastSeen,
  recentAnomalyCount,
  offlineTimeoutMs = 15_000,
}) {
  const tc = _tempComponent(temperature);
  const bc = _batteryComponent(batteryLevel);
  const lc = _latencyComponent(msSinceLastSeen, offlineTimeoutMs);
  const ac = _anomalyComponent(recentAnomalyCount);

  const raw =
    tc * WEIGHTS.temperature +
    bc * WEIGHTS.battery      +
    lc * WEIGHTS.latency      +
    ac * WEIGHTS.anomaly;

  const score = parseFloat(Math.max(0, Math.min(100, raw * 100)).toFixed(1));
  const category = getCategory(score);

  return {
    score,
    category,
    components: {
      temperature: parseFloat((tc * 100).toFixed(1)),
      battery:     parseFloat((bc * 100).toFixed(1)),
      latency:     parseFloat((lc * 100).toFixed(1)),
      anomaly:     parseFloat((ac * 100).toFixed(1)),
    },
  };
}

/**
 * Maps a numeric score to a named category.
 * @param {number} score  0–100
 * @returns {'healthy'|'warning'|'critical'}
 */
function getCategory(score) {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}

module.exports = {
  computeScore,
  getCategory,
  pruneAnomalyWindow,
  WEIGHTS,
  TEMP_BASELINE,
  TEMP_MAX,
  MAX_ANOMALIES,
  ANOMALY_WINDOW_MS,
};
