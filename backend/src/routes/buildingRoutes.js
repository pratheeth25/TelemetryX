const express = require("express");
const router  = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const {
  getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding,
  getBuildingDevices, getBuildingAccess, grantAccess, revokeAccess,
  assignDevice, unassignDevice,
} = require("../controllers/buildingController");

router.use(authenticate);

router.get("/",    getBuildings);

router.post("/",   authorize("admin","operator"), createBuilding);

router.get("/:id",    getBuilding);
router.patch("/:id",  authorize("admin","operator"), updateBuilding);
router.delete("/:id", authorize("admin"),             deleteBuilding);

router.get(   "/:id/devices",            getBuildingDevices);
router.post(  "/:id/devices/:deviceId",  authorize("admin","operator"), assignDevice);
router.delete("/:id/devices/:deviceId",  authorize("admin","operator"), unassignDevice);

router.get(   "/:id/access",            authorize("admin","operator"), getBuildingAccess);
router.post(  "/:id/access",            authorize("admin","operator"), grantAccess);
router.delete("/:id/access/:userId",    authorize("admin","operator"), revokeAccess);

module.exports = router;
