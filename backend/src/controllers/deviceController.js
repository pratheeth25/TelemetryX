'use strict';

const deviceSimulationService = require('../services/deviceSimulationService');
const networkSimulationService = require('../services/networkSimulationService');
const telemetryService = require('../services/telemetryService');

/**
 * GET /api/devices
 * Returns the current in-memory snapshot of all simulated devices.
 */
async function getDevices(req, res, next) {
  try {
    const devices = deviceSimulationService.getAllDevices();
    res.json({ count: devices.length, devices });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/add-device
 * Body: { deviceId?, name?, location: { lat, lng } }
 */
async function addDevice(req, res, next) {
  try {
    const { deviceId, name, orgId, productId, firmwareVersion, location } = req.body;

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      const err = new Error('Request body must include location.lat and location.lng as numbers.');
      err.status = 400;
      return next(err);
    }

    const device = await deviceSimulationService.addDevice({
      deviceId, name, orgId, productId, firmwareVersion, location,
    });
    res.status(201).json({ message: 'Device added successfully.', device });
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      err.status = 409;
    }
    next(err);
  }
}

/**
 * POST /api/toggle-network-simulation
 * Body (optional): { enabled?: boolean, delayMinMs?, delayMaxMs?, packetLossRate?, burstLossRate?, batchWindowMs?, bandwidthBps? }
 */
function toggleNetworkSimulation(req, res, next) {
  try {
    const {
      enabled, delayMs, delayMinMs, delayMaxMs,
      packetLossRate, burstLossRate, batchWindowMs, bandwidthBps,
    } = req.body || {};

    // Update config if any config field was provided
    const hasConfig = [delayMs, delayMinMs, delayMaxMs, packetLossRate, burstLossRate, batchWindowMs, bandwidthBps]
      .some((v) => v !== undefined);
    if (hasConfig) {
      networkSimulationService.updateConfig({
        delayMs, delayMinMs, delayMaxMs,
        packetLossRate, burstLossRate, batchWindowMs, bandwidthBps,
      });
    }

    const status = networkSimulationService.toggle(enabled);
    res.json({ message: `Network simulation is now ${status.enabled ? 'ON' : 'OFF'}.`, ...status });
  } catch (err) {
    err.status = 400;
    next(err);
  }
}

/**
 * GET /api/devices/:id/history?range=1h
 * Returns downsampled telemetry for the specified device.
 * Supported ranges: 15m | 1h | 6h | 24h | 7d  (default: 1h)
 */
async function getDeviceHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { range = '1h' } = req.query;

    const validRanges = telemetryService.getRangePresets();
    if (!validRanges.includes(range)) {
      const err = new Error(`Invalid range "${range}". Valid values: ${validRanges.join(', ')}`);
      err.status = 400;
      return next(err);
    }

    const history = await telemetryService.getHistory(id, range);
    res.json({ deviceId: id, range, count: history.length, history });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDevices, addDevice, toggleNetworkSimulation, getDeviceHistory };
