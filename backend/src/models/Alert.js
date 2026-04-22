'use strict';

const mongoose = require('mongoose');

/**
 * Alert
 *
 * Represents a triggered alert rule instance for a device.
 * A single alert lives through the following lifecycle:
 *
 *   triggered → [acknowledged] → resolved
 *
 * Deduplication key: { deviceId, ruleId } with no resolvedAt.
 * Only one OPEN alert per device+rule may exist at a time.
 */
const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    ruleId: {
      type: String,
      required: true,
      trim: true,
      // e.g. 'TEMP_HIGH', 'TEMP_CRITICAL', 'BATTERY_LOW', 'BATTERY_CRITICAL', 'DEVICE_OFFLINE'
    },
    severity: {
      type: String,
      required: true,
      enum: ['info', 'warning', 'critical'],
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    /** Current lifecycle state of this alert */
    state: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved'],
      default: 'open',
      index: true,
    },
    triggeredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    acknowledgedBy: {
      type: String,
      default: null,
      trim: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    /** Snapshot of the reading that triggered the alert */
    triggerValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: false, versionKey: false }
);

// Compound index for deduplication: find the open alert for a given device+rule
alertSchema.index({ deviceId: 1, ruleId: 1, state: 1 });

// For fetching recent open alerts efficiently
alertSchema.index({ state: 1, triggeredAt: -1 });

// TTL: auto-purge resolved alerts after 30 days
alertSchema.index(
  { resolvedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 3600, partialFilterExpression: { resolvedAt: { $ne: null } } }
);

module.exports = mongoose.model('Alert', alertSchema);
