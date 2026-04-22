'use strict';

const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['HIGH_TEMPERATURE', 'CRITICAL_TEMPERATURE', 'LOW_BATTERY', 'CRITICAL_BATTERY', 'DEVICE_OFFLINE', 'DEVICE_ONLINE', 'DEVICE_ADDED'],
      index: true,
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
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

// Compound index for efficient device+type queries (used by anomaly cooldown checks)
eventSchema.index({ deviceId: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model('Event', eventSchema);
