const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const { getAlerts, acknowledgeAlert } = require("../controllers/alertController");

router.use(authenticate);

router.get("/", getAlerts);
router.patch("/:id/acknowledge", authorize("admin", "operator"), acknowledgeAlert);

module.exports = router;
