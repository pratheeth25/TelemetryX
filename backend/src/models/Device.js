'use strict';

const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    orgId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    firmwareVersion: {
      type: String,
      default: '1.0.0',
      trim: true,
    },
    healthScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    healthCategory: {
      type: String,
      enum: ['healthy', 'warning', 'critical'],
      default: 'healthy',
    },
    location: {
      type: locationSchema,
      required: true,
    },
    temperature: {
      type: Number,
      default: 25,
      min: -273.15,
    },
    batteryLevel: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['online', 'warning', 'critical', 'offline'],
      default: 'online',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    /** High-level operational lifecycle of the device */
    lifecycleState: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FAILED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

deviceSchema.index({ orgId: 1, productId: 1 });

module.exports = mongoose.model('Device', deviceSchema);
