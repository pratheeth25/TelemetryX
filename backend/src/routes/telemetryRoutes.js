const express = require("express");
const router = express.Router();
const { getRecentTelemetry } = require("../controllers/telemetryController");

router.get("/", getRecentTelemetry);

module.exports = router;
