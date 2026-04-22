'use strict';

const mongoose = require('mongoose');

/**
 * Telemetry
 *
 * Stores raw per-device sensor readings (temperature + battery) as a
 * time-series log, separate from the Device document itself.
 *
 * Retention strategy
 * ──────────────────
 * A TTL index on `timestamp` automatically deletes documents older than
 * TELEMETRY_TTL_SECONDS (default: 7 days).  Set via env var to override.
 *
 * Query patterns
 * ──────────────
 *  • Range query per device:  { deviceId, timestamp: { $gte, $lte } }
 *  • Downsample aggregation:  $group by { deviceId, minute-bucket }
 *
 * Indexes
 * ───────
 *  1. { deviceId: 1, timestamp: -1 }  – compound for range + sort
 *  2. { timestamp: 1 }                – TTL index (MongoDB manages expiry)
 */

const TTL_SECONDS = parseInt(process.env.TELEMETRY_TTL_SECONDS, 10) || 7 * 24 * 3600; // 7 days

const telemetrySchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    temperature: {
      type: Number,
      required: true,
    },
    batteryLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    // No createdAt/updatedAt – timestamp IS the time dimension
    timestamps: false,
    // Optimise storage; we never need to iterate sub-docs
    versionKey: false,
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Primary query index: device + time range
telemetrySchema.index({ deviceId: 1, timestamp: -1 });

// TTL index – MongoDB background task deletes docs once timestamp is older than TTL_SECONDS
telemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: TTL_SECONDS });

module.exports = mongoose.model('Telemetry', telemetrySchema);
