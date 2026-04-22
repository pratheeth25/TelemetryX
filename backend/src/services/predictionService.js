'use strict';

/**
 * PredictionService
 *
 * Tracks a rolling window of readings per device and applies lightweight
 * heuristic models to produce:
 *
 *   failureRisk          0–1    probability of imminent failure
 *   predictedFailureTime number minutes until estimated failure (null = no prediction)
 *   reasons              string[] human-readable contributors
 *
 * Three heuristic signals (each 0–1, independent):
 *
 *   1. tempTrend     – linear regression slope over the last N readings;
 *                      normalised against MAX_TEMP_RATE_PER_TICK (°C / tick)
 *
 *   2. batteryDrain  – mean drain rate per tick over the window;
 *                      normalised against MAX_DRAIN_RATE_PER_TICK (% / tick)
 *
 *   3. heartbeat     – fraction of expected ticks that were actually received
 *                      in the last HEARTBEAT_WINDOW_MS milliseconds
 *                      (1 = all arrived on time, 0 = device silent)
 *
 * Final risk = weighted average of the three signals.
 *
 * Weights:
 *   tempTrend   40 %
 *   batteryDrain 35 %
 *   heartbeat    25 %
 *
 * A PREDICTED_FAILURE event is emitted when risk ≥ ALERT_THRESHOLD and the
 * previous emission for the same device was more than COOLDOWN_MS ago.
 */

const internalEmitter = require('../events/eventEmitter');
const eventLogService  = require('./eventLogService');

// ── Tuning constants ──────────────────────────────────────────────────────────

/** Number of readings retained per device. */
const WINDOW_SIZE = 20;

/**
 * Temperature rise rate (°C per tick) at which tempTrend signal = 1.
 * A device heating faster than this is considered maximally at risk.
 */
const MAX_TEMP_RATE_PER_TICK = 3.0;

/**
 * Battery drain rate (% per tick) at which the drain signal = 1.
 */
const MAX_DRAIN_RATE_PER_TICK = 1.5;

/**
 * Heartbeat window: look back this many ms when counting missed ticks.
 * Should roughly match WINDOW_SIZE × average tick interval (≈3 500 ms).
 */
const HEARTBEAT_WINDOW_MS = WINDOW_SIZE * 4_000; // 80 s

/** Average tick interval used for ETA calculation (ms). */
const AVG_TICK_INTERVAL_MS = 3_500;

/** Minimum failure-risk level to emit a PREDICTED_FAILURE event. */
const ALERT_THRESHOLD = 0.60;

/** Minimum ms between repeated PREDICTED_FAILURE events per device. */
const COOLDOWN_MS = 60_000; // 1 minute

// ── Weights (must sum to 1) ───────────────────────────────────────────────────
const W_TEMP     = 0.40;
const W_BATTERY  = 0.35;
const W_HEARTBEAT = 0.25;

// ── PredictionService ─────────────────────────────────────────────────────────

class PredictionService {
  constructor() {
    /**
     * Map<deviceId, Reading[]>
     * Reading: { temperature: number, batteryLevel: number, ts: number }
     */
    this._windows  = new Map();
    /** Map<deviceId, number>  – epoch-ms of last PREDICTED_FAILURE emission */
    this._lastAlert = new Map();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Record a new reading for a device and return the latest prediction.
   *
   * @param {object} device  Live device state from the simulation tick
   * @returns {{ failureRisk: number, predictedFailureTime: number|null, reasons: string[] }}
   */
  record(device) {
    const { deviceId, temperature, batteryLevel } = device;
    const ts = Date.now();

    // Maintain sliding window
    const win = this._windows.get(deviceId) || [];
    win.push({ temperature, batteryLevel, ts });
    if (win.length > WINDOW_SIZE) win.shift();
    this._windows.set(deviceId, win);

    return this._evaluate(deviceId, win);
  }

  /**
   * Remove all tracking state for a device.
   * @param {string} deviceId
   */
  evict(deviceId) {
    this._windows.delete(deviceId);
    this._lastAlert.delete(deviceId);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _evaluate(deviceId, win) {
    if (win.length < 3) {
      // Not enough data for a meaningful prediction
      return { failureRisk: 0, predictedFailureTime: null, reasons: [] };
    }

    const reasons = [];

    // ── 1. Temperature trend signal ──────────────────────────────────────────
    const tempSlope = this._linearSlope(win.map((r) => r.temperature));
    const tempSignal = Math.max(0, Math.min(1, tempSlope / MAX_TEMP_RATE_PER_TICK));
    if (tempSignal > 0.3) {
      reasons.push(`Rapid temperature rise (+${(tempSlope).toFixed(2)}°C/tick)`);
    }

    // ── 2. Battery drain signal ──────────────────────────────────────────────
    const drainRate = this._meanDrainRate(win.map((r) => r.batteryLevel));
    const battSignal = Math.max(0, Math.min(1, drainRate / MAX_DRAIN_RATE_PER_TICK));
    if (battSignal > 0.3) {
      reasons.push(`High battery drain (${drainRate.toFixed(3)}%/tick)`);
    }

    // ── 3. Heartbeat (missed-tick) signal ────────────────────────────────────
    const heartbeatSignal = this._heartbeatSignal(win);
    if (heartbeatSignal > 0.3) {
      reasons.push(`Irregular heartbeat (${(heartbeatSignal * 100).toFixed(0)}% ticks missing)`);
    }

    // ── Composite risk ───────────────────────────────────────────────────────
    const failureRisk = parseFloat(
      (tempSignal * W_TEMP + battSignal * W_BATTERY + heartbeatSignal * W_HEARTBEAT)
        .toFixed(4)
    );

    // ── ETA prediction ───────────────────────────────────────────────────────
    let predictedFailureTime = null;
    if (failureRisk > 0.05) {
      // Estimate ticks until risk reaches 1.0, then convert to minutes
      // Safety floor of 1 tick to avoid divide-by-zero or negative ETAs
      const ratePerTick = Math.max(failureRisk / Math.max(win.length, 1), 0.001);
      const ticksRemaining = Math.max(1, (1 - failureRisk) / ratePerTick);
      predictedFailureTime = parseFloat(
        ((ticksRemaining * AVG_TICK_INTERVAL_MS) / 60_000).toFixed(1)
      );
    }

    // ── Emit alert if threshold exceeded ────────────────────────────────────
    if (failureRisk >= ALERT_THRESHOLD) {
      this._maybeEmitAlert(deviceId, failureRisk, predictedFailureTime, reasons);
    }

    return { failureRisk, predictedFailureTime, reasons };
  }

  /** Simple least-squares linear slope over an array of values. */
  _linearSlope(values) {
    const n = values.length;
    if (n < 2) return 0;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX  += i;
      sumY  += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  }

  /** Mean per-tick drain (drop in battery level). Positive = draining. */
  _meanDrainRate(levels) {
    if (levels.length < 2) return 0;
    let totalDrop = 0;
    let count = 0;
    for (let i = 1; i < levels.length; i++) {
      const drop = levels[i - 1] - levels[i]; // positive when draining
      if (drop > 0) { totalDrop += drop; count++; }
    }
    return count === 0 ? 0 : totalDrop / count;
  }

  /**
   * Measures the fraction of expected ticks that are missing based on
   * inter-arrival time gaps in the window. Returns 0 (all good) to 1 (silent).
   */
  _heartbeatSignal(win) {
    if (win.length < 2) return 0;
    const now = Date.now();
    const windowStart = now - HEARTBEAT_WINDOW_MS;

    // Count actual ticks in window
    const inWindow = win.filter((r) => r.ts >= windowStart).length;
    // Expected ticks
    const expected = Math.max(1, HEARTBEAT_WINDOW_MS / AVG_TICK_INTERVAL_MS);
    const missedFraction = Math.max(0, 1 - inWindow / expected);

    // Also flag large gaps between consecutive readings
    let maxGapMs = 0;
    for (let i = 1; i < win.length; i++) {
      maxGapMs = Math.max(maxGapMs, win[i].ts - win[i - 1].ts);
    }
    // If max gap > 2× average tick, treat proportionally as a missed-tick signal
    const gapSignal = Math.max(0, Math.min(1, (maxGapMs / AVG_TICK_INTERVAL_MS - 2) / 5));

    return Math.max(missedFraction, gapSignal);
  }

  _maybeEmitAlert(deviceId, failureRisk, predictedFailureTime, reasons) {
    const now = Date.now();
    const last = this._lastAlert.get(deviceId) || 0;
    if (now - last < COOLDOWN_MS) return;
    this._lastAlert.set(deviceId, now);

    const etaText = predictedFailureTime !== null
      ? `in ~${predictedFailureTime} min`
      : 'soon';

    const payload = {
      deviceId,
      type:      'PREDICTED_FAILURE',
      severity:  'warning',
      failureRisk,
      predictedFailureTime,
      reasons,
      message:   `Device ${deviceId} predicted to fail ${etaText} (risk: ${(failureRisk * 100).toFixed(0)}%)`,
      timestamp: new Date(),
    };

    eventLogService.log(payload).catch((err) => {
      console.error('[Prediction] Failed to log event:', err.message);
    });

    internalEmitter.emit(internalEmitter.PREDICTED_FAILURE, payload);
  }
}

module.exports = new PredictionService();
