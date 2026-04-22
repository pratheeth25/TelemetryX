'use strict';

const Device = require('../models/Device');
const Organization = require('../models/Organization');
const Product = require('../models/Product');
const internalEmitter = require('../events/eventEmitter');
const networkSimulationService = require('./networkSimulationService');
const anomalyDetectionService = require('./anomalyDetectionService');
const eventLogService = require('./eventLogService');
const thresholds = require('../config/thresholds');
const healthScoreService = require('./healthScoreService');
const predictionService  = require('./predictionService');
const telemetryService   = require('./telemetryService');
const alertService       = require('./alertService');
const lifecycleService   = require('./lifecycleService');
const observabilityService = require('./observabilityService');
const { ORGS, PRODUCTS, DEVICES } = require('../config/seedData');

/**
 * DeviceSimulationService
 *
 * Maintains an in-memory registry of simulated IoT devices.
 * Each device is ticked every 2–5 seconds; the update is piped
 * through the network simulation layer before being broadcast.
 */
class DeviceSimulationService {
  constructor() {
    /** Map<deviceId, deviceState> */
    this._devices = new Map();
    /** Map<deviceId, intervalId> */
    this._intervals = new Map();
    /** Map<deviceId, number[]> – epoch-ms timestamps of recent anomalies per device */
    this._anomalyWindows = new Map();
    this._io = null;
    this._started = false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async start(io) {
    if (this._started) return;
    this._io = io;
    this._started = true;

    // Start anomaly detection listener FIRST
    anomalyDetectionService.start();

    // Broadcast anomalies over Socket.IO and track per-device anomaly frequency
    internalEmitter.on(internalEmitter.ANOMALY_DETECTED, (payload) => {
      if (this._io) this._io.emit('anomaly:detected', payload);
      // Record timestamp for health-score anomaly component
      const win = this._anomalyWindows.get(payload.deviceId) || [];
      win.push(Date.now());
      this._anomalyWindows.set(payload.deviceId, win);
    });

    // Broadcast predicted-failure events over Socket.IO
    internalEmitter.on(internalEmitter.PREDICTED_FAILURE, (payload) => {
      if (this._io) this._io.emit('prediction:update', payload);
    });

    // Broadcast alert events over Socket.IO
    internalEmitter.on(internalEmitter.ALERT_TRIGGERED, (payload) => {
      if (this._io) this._io.emit('alert:update', { action: 'triggered', alert: payload });
    });
    internalEmitter.on(internalEmitter.ALERT_RESOLVED, (payload) => {
      if (this._io) this._io.emit('alert:update', { action: 'resolved', alert: payload });
    });

    // Broadcast lifecycle state changes over Socket.IO
    internalEmitter.on(internalEmitter.LIFECYCLE_CHANGE, (payload) => {
      if (this._io) this._io.emit('lifecycle:change', payload);
    });

    // Ensure orgs and products exist in DB (idempotent upserts)
    await this._seedOrgsAndProducts();

    // Load persisted devices from MongoDB (if any)
    const persisted = await Device.find().lean();
    for (const d of persisted) {
      const state = this._toState(d);
      this._devices.set(state.deviceId, state);
      this._scheduleInterval(state.deviceId);
    }

    // Seed 15 pre-configured devices if DB is empty
    if (this._devices.size === 0) {
      for (const seed of DEVICES) {
        await this.addDevice(seed);
      }
    }

    console.log(`[DeviceSimulation] Started with ${this._devices.size} device(s).`);
  }

  async _seedOrgsAndProducts() {
    for (const org of ORGS) {
      await Organization.findOneAndUpdate(
        { orgId: org.orgId }, org, { upsert: true, new: true }
      );
    }
    for (const product of PRODUCTS) {
      await Product.findOneAndUpdate(
        { productId: product.productId }, product, { upsert: true, new: true }
      );
    }
  }

  getAllDevices() {
    return Array.from(this._devices.values());
  }

  getDevice(deviceId) {
    return this._devices.get(deviceId) || null;
  }

  async addDevice({ deviceId, orgId, productId, name, firmwareVersion, location }) {
    const id = deviceId || `dev-${Date.now()}`;

    if (this._devices.has(id)) {
      throw new Error(`Device with id "${id}" already exists.`);
    }

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      throw new Error('location must have numeric lat and lng.');
    }

    const newDevice = await Device.findOneAndUpdate(
      { deviceId: id },
      {
        deviceId: id,
        orgId: orgId || 'org-nexus',
        productId: productId || 'prod-nx-mobile',
        name: name || id,
        firmwareVersion: firmwareVersion || '1.0.0',
        healthScore: 100,
        healthCategory: 'healthy',
        location,
        temperature: this._randomTemp(),
        batteryLevel: this._randomBattery(),
        status: 'online',
        lastSeen: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const state = this._toState(newDevice.toObject());
    this._devices.set(id, state);

    if (this._started) {
      this._scheduleInterval(id);
    }

    await eventLogService.log({
      deviceId: id,
      type: 'DEVICE_ADDED',
      severity: 'info',
      message: `Device ${id} (${name || id}) registered.`,
    });

    return state;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _scheduleInterval(deviceId) {
    const delay = this._randomTickInterval();
    const id = setInterval(() => this._tick(deviceId), delay);
    this._intervals.set(deviceId, id);
  }

  async _tick(deviceId) {
    const device = this._devices.get(deviceId);
    if (!device) return;

    // Generate new readings
    device.temperature   = this._jitter(device.temperature, -2, 3, 0, 120);
    device.batteryLevel  = Math.max(0, device.batteryLevel - Math.random() * 0.5);
    device.lastSeen      = new Date();

    // Compute 4-factor health score
    const msSinceLastSeen = 0; // device just updated, latency is near-zero at tick time
    const win = this._anomalyWindows.get(deviceId) || [];
    healthScoreService.pruneAnomalyWindow(win);
    this._anomalyWindows.set(deviceId, win);
    const { score, category } = healthScoreService.computeScore({
      temperature:        device.temperature,
      batteryLevel:       device.batteryLevel,
      msSinceLastSeen,
      recentAnomalyCount: win.length,
      offlineTimeoutMs:   thresholds.offlineTimeoutMs,
    });
    device.healthScore    = score;
    device.healthCategory = category;

    const prevStatus = device.status;
    device.status = this._computeStatus(device);

    const transmitted = await networkSimulationService.transmit({ ...device });

    if (transmitted === null) {
      const msSinceLastSeen = Date.now() - new Date(device.lastSeen).getTime();
      if (msSinceLastSeen > thresholds.offlineTimeoutMs) {
        device.status = 'offline';
      }
      return;
    }

    Device.findOneAndUpdate(
      { deviceId },
      {
        temperature:    device.temperature,
        batteryLevel:   device.batteryLevel,
        healthScore:    device.healthScore,
        healthCategory: device.healthCategory,
        status:         device.status,
        lastSeen:       device.lastSeen,
      }
    ).catch((err) => console.error('[DeviceSimulation] DB update error:', err.message));

    // Evaluate alert rules (dedup + auto-resolve handled inside)
    alertService.evaluate(device);

    // Evaluate lifecycle state transitions
    lifecycleService.evaluate(device);

    // Update observability active-device count
    observabilityService.setActiveDevices(this._devices.size);

    // Write raw telemetry (rate-limited internally; fire-and-forget)
    telemetryService.record(deviceId, device.temperature, device.batteryLevel);

    internalEmitter.emit(internalEmitter.DEVICE_UPDATE, { ...transmitted });

    if (this._io) {
      this._io.emit('device:update', transmitted);
    }

    // Run prediction and push to connected clients
    const prediction = predictionService.record(device);
    device.failureRisk           = prediction.failureRisk;
    device.predictedFailureTime  = prediction.predictedFailureTime;
    device.predictionReasons     = prediction.reasons;
    if (this._io) {
      this._io.emit('prediction:update', {
        deviceId,
        failureRisk:          prediction.failureRisk,
        predictedFailureTime: prediction.predictedFailureTime,
        reasons:              prediction.reasons,
        timestamp:            new Date(),
      });
    }

    if (prevStatus !== device.status) {
      internalEmitter.emit(internalEmitter.DEVICE_STATUS_CHANGE, {
        deviceId, from: prevStatus, to: device.status,
      });
      if (device.status === 'online' && prevStatus === 'offline') {
        eventLogService.log({
          deviceId,
          type: 'DEVICE_ONLINE',
          severity: 'info',
          message: `Device ${deviceId} came back online.`,
        }).catch(() => {});
      }
    }
  }

  _computeStatus(device) {
    if (
      device.temperature >= thresholds.temperature.critical ||
      device.batteryLevel <= thresholds.battery.critical
    ) {
      return 'critical';
    }
    if (
      device.temperature >= thresholds.temperature.high ||
      device.batteryLevel <= thresholds.battery.low
    ) {
      return 'warning';
    }
    return 'online';
  }

  _toState(doc) {
    return {
      deviceId:             doc.deviceId,
      orgId:                doc.orgId           || 'org-nexus',
      productId:            doc.productId       || '',
      name:                 doc.name            || doc.deviceId,
      firmwareVersion:      doc.firmwareVersion || '1.0.0',
      healthScore:          doc.healthScore     ?? 100,
      healthCategory:       doc.healthCategory  || healthScoreService.getCategory(doc.healthScore ?? 100),
      failureRisk:          doc.failureRisk          ?? 0,
      predictedFailureTime: doc.predictedFailureTime ?? null,
      predictionReasons:    doc.predictionReasons    ?? [],
      location:             doc.location,
      temperature:          doc.temperature     ?? this._randomTemp(),
      batteryLevel:         doc.batteryLevel    ?? this._randomBattery(),
      status:               doc.status          || 'online',
      lifecycleState:       doc.lifecycleState  || 'ACTIVE',
      lastSeen:             doc.lastSeen        || new Date(),
    };
  }

  _jitter(value, min, max, floor, ceiling) {
    const next = value + min + Math.random() * (max - min);
    return Math.min(ceiling, Math.max(floor, parseFloat(next.toFixed(2))));
  }

  _randomTemp() {
    return parseFloat((20 + Math.random() * 40).toFixed(2));
  }

  _randomBattery() {
    return parseFloat((50 + Math.random() * 50).toFixed(2));
  }

  /** Returns a random tick interval between 2 000 and 5 000 ms */
  _randomTickInterval() {
    return 2000 + Math.floor(Math.random() * 3000);
  }
}

module.exports = new DeviceSimulationService();
