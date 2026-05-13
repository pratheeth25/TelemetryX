const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  getAllDevices, getDevice, getDeviceHistory,
  createDevice, updateDevice, deleteDevice, toggleDevice, heartbeat, getDeviceAudit,
  getDeviceGraph,
} = require("../controllers/deviceController");

router.use(authenticate);

router.get("/",             getAllDevices);
router.get("/graph",        getDeviceGraph);
router.get("/:id",          getDevice);
router.get("/:id/history",  getDeviceHistory);
router.get("/:id/audit",    authorize("admin", "operator"), getDeviceAudit);

router.post("/",            authorize("admin"),              createDevice);
router.patch("/:id",        authorize("admin", "operator"),  updateDevice);
router.delete("/:id",       authorize("admin"),              deleteDevice);
router.patch("/:id/toggle", authorize("admin", "operator"),  toggleDevice);
router.post("/:id/heartbeat", heartbeat);

module.exports = router;
