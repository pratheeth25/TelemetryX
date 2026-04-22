'use strict';

const observabilityService = require('../services/observabilityService');
const networkSimulationService = require('../services/networkSimulationService');

/**
 * GET /metrics
 * Returns system-level observability metrics.
 */
function getMetrics(req, res, next) {
  try {
    const metrics = observabilityService.getMetrics(networkSimulationService);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/network/status
 * Returns current network simulation status + metrics.
 */
function getNetworkStatus(req, res, next) {
  try {
    res.json(networkSimulationService.getStatus());
  } catch (err) {
    next(err);
  }
}

module.exports = { getMetrics, getNetworkStatus };
