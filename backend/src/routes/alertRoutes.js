'use strict';

const express = require('express');
const { getAlerts, getAlertStats, acknowledgeAlert, resolveAlert } = require('../controllers/alertController');

const router = express.Router();

router.get('/alerts',                      getAlerts);
router.get('/alerts/stats',                getAlertStats);
router.post('/alerts/:id/acknowledge',     acknowledgeAlert);
router.post('/alerts/:id/resolve',         resolveAlert);

module.exports = router;
