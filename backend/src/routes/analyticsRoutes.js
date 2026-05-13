const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  getSummary, getTelemetryAnalytics, getAlertAnalytics, getUptimeAnalytics, exportCSV,
} = require("../controllers/analyticsController");

router.use(authenticate);

router.get("/summary",   getSummary);
router.get("/telemetry", getTelemetryAnalytics);
router.get("/alerts",    getAlertAnalytics);
router.get("/uptime",    getUptimeAnalytics);

router.get("/export/csv", authorize("admin","operator"), exportCSV);

module.exports = router;
