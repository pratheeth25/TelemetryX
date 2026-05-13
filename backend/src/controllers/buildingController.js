const Building       = require("../models/Building");
const BuildingAccess = require("../models/BuildingAccess");
const Device         = require("../models/Device");
const User           = require("../models/User");
const AuditLog       = require("../models/AuditLog");
const { nanoid }     = require("nanoid");

async function hasAccess(userId, buildingId, role) {
  if (role === "admin") return true;
  if (role === "operator") {
    const b = await Building.findOne({ buildingId });
    return b && b.ownerId === userId;
  }
  const access = await BuildingAccess.findOne({ userId, buildingId });
  return !!access;
}

async function getBuildings(req, res, next) {
  try {
    const { role, sub: userId } = req.user;
    let buildings;

    if (role === "admin") {
      buildings = await Building.find().sort({ createdAt: -1 });
    } else if (role === "operator") {
      buildings = await Building.find({ ownerId: userId }).sort({ createdAt: -1 });
    } else {
      const grants = await BuildingAccess.find({ userId });
      const ids    = grants.map((g) => g.buildingId);
      buildings    = await Building.find({ buildingId: { $in: ids } }).sort({ name: 1 });
    }

    const result = await Promise.all(buildings.map(async (b) => {
      const count = await Device.countDocuments({ buildingId: b.buildingId });
      return { ...b.toObject(), deviceCount: count };
    }));

    res.json(result);
  } catch (err) { next(err); }
}

async function createBuilding(req, res, next) {
  try {
    const { name, buildingType, address, description } = req.body;
    if (!name) return res.status(400).json({ error: "Building name is required" });

    const building = await Building.create({
      buildingId:   `bld-${nanoid(8).toLowerCase()}`,
      name, buildingType, address, description,
      ownerId:   req.user.sub,
      ownerName: req.user.email,
    });

    await AuditLog.create({
      actor: req.user.sub, actorName: req.user.email,
      action: "BUILDING_CREATED",
      targetType: "building", targetId: building.buildingId,
      details: { name, buildingType },
    });

    res.status(201).json(building);
  } catch (err) { next(err); }
}

async function updateBuilding(req, res, next) {
  try {
    const { id } = req.params;
    if (!(await hasAccess(req.user.sub, id, req.user.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const allowed = ["name","buildingType","address","description"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const building = await Building.findOneAndUpdate({ buildingId: id }, updates, { new: true });
    if (!building) return res.status(404).json({ error: "Building not found" });

    res.json(building);
  } catch (err) { next(err); }
}

async function deleteBuilding(req, res, next) {
  try {
    const { id } = req.params;
    const building = await Building.findOneAndDelete({ buildingId: id });
    if (!building) return res.status(404).json({ error: "Building not found" });

    await Device.updateMany({ buildingId: id }, { $set: { buildingId: null } });
    await BuildingAccess.deleteMany({ buildingId: id });

    await AuditLog.create({
      actor: req.user.sub, actorName: req.user.email,
      action: "BUILDING_DELETED",
      targetType: "building", targetId: id,
    });

    res.json({ message: "Building deleted" });
  } catch (err) { next(err); }
}

async function getBuildingDevices(req, res, next) {
  try {
    const { id } = req.params;
    const { sub: userId, role } = req.user;

    if (!(await hasAccess(userId, id, role))) {
      return res.status(403).json({ error: "Access denied to this building" });
    }

    const devices = await Device.find({ buildingId: id }).sort({ name: 1 });
    res.json(devices);
  } catch (err) { next(err); }
}

async function getBuildingAccess(req, res, next) {
  try {
    const { id } = req.params;
    if (!(await hasAccess(req.user.sub, id, req.user.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const grants = await BuildingAccess.find({ buildingId: id });
    const enriched = await Promise.all(grants.map(async (g) => {
      const u = await User.findById(g.userId).catch(() => null);
      return {
        ...g.toObject(),
        userName:  u?.name  || "Unknown",
        userEmail: u?.email || "",
      };
    }));

    res.json(enriched);
  } catch (err) { next(err); }
}

async function grantAccess(req, res, next) {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    if (!(await hasAccess(req.user.sub, id, req.user.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const building = await Building.findOne({ buildingId: id });
    if (!building) return res.status(404).json({ error: "Building not found" });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    if (targetUser.role !== "viewer") {
      return res.status(400).json({ error: "Access grants are only for viewers" });
    }

    await BuildingAccess.findOneAndUpdate(
      { userId, buildingId: id },
      { userId, buildingId: id, permissionType: "view", grantedBy: req.user.sub, grantedByName: req.user.email },
      { upsert: true, new: true }
    );

    await AuditLog.create({
      actor: req.user.sub, actorName: req.user.email,
      action: "BUILDING_ACCESS_GRANTED",
      targetType: "building", targetId: id,
      details: { userId, userEmail: targetUser.email },
    });

    res.json({ message: `Access granted to ${targetUser.email}` });
  } catch (err) { next(err); }
}

async function revokeAccess(req, res, next) {
  try {
    const { id, userId } = req.params;

    if (!(await hasAccess(req.user.sub, id, req.user.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    await BuildingAccess.findOneAndDelete({ userId, buildingId: id });

    await AuditLog.create({
      actor: req.user.sub, actorName: req.user.email,
      action: "BUILDING_ACCESS_REVOKED",
      targetType: "building", targetId: id,
      details: { userId },
    });

    res.json({ message: "Access revoked" });
  } catch (err) { next(err); }
}

async function assignDevice(req, res, next) {
  try {
    const { id, deviceId } = req.params;
    if (!(await hasAccess(req.user.sub, id, req.user.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const device = await Device.findOneAndUpdate(
      { deviceId },
      { buildingId: id },
      { new: true }
    );
    if (!device) return res.status(404).json({ error: "Device not found" });

    res.json(device);
  } catch (err) { next(err); }
}

async function unassignDevice(req, res, next) {
  try {
    const { id, deviceId } = req.params;
    if (!(await hasAccess(req.user.sub, id, req.user.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const device = await Device.findOneAndUpdate(
      { deviceId, buildingId: id },
      { buildingId: null },
      { new: true }
    );
    if (!device) return res.status(404).json({ error: "Device not found or not assigned to this building" });

    res.json(device);
  } catch (err) { next(err); }
}

async function getBuilding(req, res, next) {
  try {
    const { id } = req.params;
    if (!(await hasAccess(req.user.sub, id, req.user.role))) {
      return res.status(403).json({ error: "Access denied to this building" });
    }
    const building = await Building.findOne({ buildingId: id });
    if (!building) return res.status(404).json({ error: "Building not found" });
    const deviceCount = await Device.countDocuments({ buildingId: id });
    res.json({ ...building.toObject(), deviceCount });
  } catch (err) { next(err); }
}

module.exports = {
  getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding,
  getBuildingDevices, getBuildingAccess, grantAccess, revokeAccess,
  assignDevice, unassignDevice,
};
