'use strict';

const express = require('express');
const { getDevices, addDevice, toggleNetworkSimulation, getDeviceHistory } = require('../controllers/deviceController');
const { setLifecycleState, getLifecycleHistory } = require('../controllers/lifecycleController');

const router = express.Router();

router.get('/devices', getDevices);
router.get('/devices/:id/history', getDeviceHistory);
router.get('/devices/:id/lifecycle/history', getLifecycleHistory);
router.patch('/devices/:id/lifecycle', setLifecycleState);
router.post('/add-device', addDevice);
router.post('/toggle-network-simulation', toggleNetworkSimulation);

module.exports = router;
