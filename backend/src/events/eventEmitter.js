'use strict';

const { EventEmitter } = require('events');

/**
 * Application-wide internal event bus.
 * Used to decouple the simulation engine from anomaly detection,
 * event logging, and Socket.IO broadcasting.
 *
 * Event catalogue
 * ───────────────
 *  DEVICE_UPDATE        – emitted every simulation tick (after network pass-through)
 *  ANOMALY_DETECTED     – emitted by AnomalyDetectionService
 *  DEVICE_STATUS_CHANGE – emitted when a device's status changes
 *  PREDICTED_FAILURE    – emitted by PredictionService when failureRisk is high
 */
class SkyTrackEventEmitter extends EventEmitter {}

const emitter = new SkyTrackEventEmitter();

// Raise the default listener limit so many services can subscribe without warnings
emitter.setMaxListeners(30);

// Named event constants – import this file to avoid magic strings
emitter.DEVICE_UPDATE = 'device:update';
emitter.ANOMALY_DETECTED = 'anomaly:detected';
emitter.DEVICE_STATUS_CHANGE = 'device:status:change';
emitter.PREDICTED_FAILURE = 'prediction:failure';
emitter.ALERT_TRIGGERED = 'alert:triggered';
emitter.ALERT_RESOLVED = 'alert:resolved';
emitter.LIFECYCLE_CHANGE = 'lifecycle:change';

module.exports = emitter;
