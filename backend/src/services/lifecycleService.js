'use strict';

const Device = require('../models/Device');
const LifecycleEvent = require('../models/LifecycleEvent');
const internalEmitter = require('../events/eventEmitter');
const thresholds = require('../config/thresholds');

/**
 * LifecycleService
 *
 * Manages device lifecycle state transitions.
 *
 * States
 * ──────
 *  ACTIVE       – operating normally
 *  INACTIVE     – no telemetry received for > offlineTimeoutMs × 3
 *  MAINTENANCE  – manually placed by operator
 *  FAILED       – sustained critical condition detected by the simulation
 *
 * Auto-transition rules (called each simulation tick)
 * ────────────────────────────────────────────────────
 *  status === 'offline' for > inactiveThresholdMs   → INACTIVE
 *  healthCategory === 'critical' for > failedStreakNeeded consecutive ticks → FAILED
 *  Condition normalises (status online, healthCategory not critical)       → ACTIVE
 *
 * Manual override
 * ───────────────
 *  `transition(deviceId, newState, reason, 'manual')` allows operators to
 *  set MAINTENANCE or force ACTIVE from any state.
 */

/** Number of consecutive critical ticks before auto-FAILED */
const FAILED_STREAK_NEEDED = parseInt(process.env.LIFECYCLE_FAILED_STREAK, 10) || 5;

/** ms without an update before marking INACTIVE (3× the offline timeout) */
const INACTIVE_THRESHOLD_MS =
  (parseInt(process.env.THRESHOLD_OFFLINE_MS, 10) || 15_000) * 3;

/** Per-device critical-tick counters (in-memory) */
const _criticalStreak = new Map();

class LifecycleService {
  // ── Automatic evaluation (called from simulation tick) ─────────────────────

  /**
   * Evaluate whether the device should transition to a new lifecycle state.
   * Only auto-transitions; does NOT override MAINTENANCE (that is operator-set).
   *
   * @param {object} deviceState  Live in-memory device state
   */
  evaluate(deviceState) {
    this._autoTransition(deviceState).catch((err) =>
      console.error('[LifecycleService] evaluate error:', err.message)
    );
  }

  // ── Manual override (REST API) ─────────────────────────────────────────────

  /**
   * Transition a device to a new lifecycle state.
   *
   * @param {string} deviceId
   * @param {string} newState  'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FAILED'
   * @param {string} [reason]
   * @param {string} [source]  'auto' | 'manual'
   * @returns {Promise<object>}  Updated Device document
   */
  async transition(deviceId, newState, reason = '', source = 'manual') {
    const VALID = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FAILED'];
    if (!VALID.includes(newState)) {
      throw Object.assign(new Error(`Invalid lifecycle state: "${newState}"`), { status: 400 });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      throw Object.assign(new Error(`Device "${deviceId}" not found`), { status: 404 });
    }

    const fromState = device.lifecycleState || 'ACTIVE';
    if (fromState === newState) return device.toObject(); // no-op

    // Persist the event to the audit log
    await LifecycleEvent.create({
      deviceId,
      fromState,
      toState: newState,
      reason,
      source,
      timestamp: new Date(),
    });

    // Update the device document
    device.lifecycleState = newState;
    await device.save();

    const payload = { deviceId, fromState, toState: newState, reason, source, timestamp: new Date() };
    internalEmitter.emit(internalEmitter.LIFECYCLE_CHANGE, payload);

    return device.toObject();
  }

  /**
   * Retrieve the lifecycle history for a device, newest first.
   * @param {string} deviceId
   * @param {number} [limit]
   */
  static getHistory(deviceId, limit = 100) {
    return LifecycleEvent.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async _autoTransition(deviceState) {
    const { deviceId, status, healthCategory } = deviceState;

    // Fetch current persisted lifecycle state
    const doc = await Device.findOne({ deviceId }, { lifecycleState: 1 }).lean();
    if (!doc) return;

    const current = doc.lifecycleState || 'ACTIVE';

    // Never auto-override a manually set MAINTENANCE state
    if (current === 'MAINTENANCE') return;

    const msSinceLastSeen = Date.now() - new Date(deviceState.lastSeen).getTime();

    // ── INACTIVE: device has been offline for too long
    if (status === 'offline' && msSinceLastSeen >= INACTIVE_THRESHOLD_MS) {
      if (current !== 'INACTIVE') {
        await this.transition(deviceId, 'INACTIVE', 'No telemetry received', 'auto');
        _criticalStreak.set(deviceId, 0);
      }
      return;
    }

    // ── FAILED: sustained critical health
    if (healthCategory === 'critical' && status !== 'offline') {
      const streak = (_criticalStreak.get(deviceId) || 0) + 1;
      _criticalStreak.set(deviceId, streak);
      if (streak >= FAILED_STREAK_NEEDED && current !== 'FAILED') {
        await this.transition(deviceId, 'FAILED', 'Sustained critical readings', 'auto');
      }
      return;
    }

    // ── ACTIVE: condition has normalised
    if ((current === 'FAILED' || current === 'INACTIVE') && status !== 'offline' && healthCategory !== 'critical') {
      _criticalStreak.set(deviceId, 0);
      await this.transition(deviceId, 'ACTIVE', 'Condition normalised', 'auto');
      return;
    }

    // Reset streak if condition improved
    if (healthCategory !== 'critical') {
      _criticalStreak.set(deviceId, 0);
    }
  }
}

module.exports = new LifecycleService();
