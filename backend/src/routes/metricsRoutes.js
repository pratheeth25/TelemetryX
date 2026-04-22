'use strict';

const express = require('express');
const { getMetrics, getNetworkStatus } = require('../controllers/metricsController');

const router = express.Router();

// Prometheus-style metrics endpoint (no /api prefix – mounted at root)
router.get('/metrics', getMetrics);

// Network status (under /api)
router.get('/network/status', getNetworkStatus);

module.exports = router;
