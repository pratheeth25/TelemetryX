'use strict';

const mongoose = require('mongoose');

/**
 * LifecycleEvent
 *
 * Immutable audit log of every device lifecycle state transition.
 * Used to render the device timeline in the frontend.
 *
 * States: ACTIVE | INACTIVE | MAINTENANCE | FAILED
 *
 * TTL: auto-purge entries older than 90 days.
 */
const lifecycleEventSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    fromState: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FAILED', null],
      default: null,
    },
    toState: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FAILED'],
    },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    /** 'auto' = system-driven, 'manual' = API override */
    source: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: false, versionKey: false }
);

lifecycleEventSchema.index({ deviceId: 1, timestamp: -1 });
lifecycleEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('LifecycleEvent', lifecycleEventSchema);
