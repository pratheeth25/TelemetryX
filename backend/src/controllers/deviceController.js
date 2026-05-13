const Device    = require("../models/Device");
const Telemetry = require("../models/Telemetry");
const AuditLog  = require("../models/AuditLog");
const { nanoid } = require("nanoid");

function normalise(value, min, max) {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}
function connectivityWeight(a, b) {
  const sigA = normalise(a.signalStrength ?? -70, -90, -40);
  const sigB = normalise(b.signalStrength ?? -70, -90, -40);
  const latA = 100 - normalise(a.latency ?? 50, 5, 300);
  const latB = 100 - normalise(b.latency ?? 50, 5, 300);
  const plA  = 100 - normalise(a.packetLoss ?? 5, 0, 25);
  const plB  = 100 - normalise(b.packetLoss ?? 5, 0, 25);
  return Math.min(100, Math.round(
    ((sigA + sigB) / 2) * 0.40 +
    ((latA + latB) / 2) * 0.35 +
    ((plA  + plB)  / 2) * 0.25
  ));
}

async function getAllDevices(req, res, next) {
  try {
    const houseId = req.user.houseId;
    const filter  = { houseId };
    if (req.query.status)              filter.status  = req.query.status;
    if (req.query.enabled !== undefined) filter.enabled = req.query.enabled === "true";
    if (req.query.search)              filter.$text   = { $search: req.query.search };
    const devices = await Device.find(filter).sort({ deviceId: 1 });
    res.json(devices);
  } catch (err) { next(err); }
}

async function getDevice(req, res, next) {
  try {
    const device = await Device.findOne({ deviceId: req.params.id, houseId: req.user.houseId });
    if (!device) return res.status(404).json({ error: "Device not found" });
    res.json(device);
  } catch (err) { next(err); }
}

async function getDeviceHistory(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await Telemetry.find({ deviceId: req.params.id, houseId: req.user.houseId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(history.reverse());
  } catch (err) { next(err); }
}

async function createDevice(req, res, next) {
  try {
    const { name, location, type, group, firmwareVersion, description, tags, settings } = req.body;
    if (!name) return res.status(400).json({ error: "Device name is required" });

    const houseId  = req.user.houseId;
    const deviceId = `dev-${nanoid(8).toLowerCase()}`;

    const device = await Device.create({
      deviceId, name,
      location:        location || "Unknown",
      type:            type || "smart_speaker",
      houseId,
      group:           group || "default",
      firmwareVersion: firmwareVersion || "1.0.0",
      description:     description || "",
      tags:            tags || [],
      settings:        settings || {},
      registeredBy:    req.user.sub,
    });

    await AuditLog.create({
      houseId, actor: req.user.sub, actorName: req.user.email,
      action: "DEVICE_CREATED", targetType: "device", targetId: deviceId,
      details: { name, location, type },
    });

    if (io) io.to(houseId).emit("deviceAdded", device.toObject());

    res.status(201).json(device);
  } catch (err) { next(err); }
}

async function updateDevice(req, res, next) {
  try {
    const role = req.user.role;
    const adminFields    = ["name","location","type","group","firmwareVersion","description","tags","enabled","settings"];
    const operatorFields = ["enabled","group","description","firmwareVersion","settings"];
    const allowed = role === "admin" ? adminFields : operatorFields;

    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.id, houseId: req.user.houseId },
      updates,
      { new: true }
    );
    if (!device) return res.status(404).json({ error: "Device not found" });

    await AuditLog.create({
      houseId: req.user.houseId, actor: req.user.sub, actorName: req.user.email,
      action: "DEVICE_UPDATED", targetType: "device", targetId: req.params.id,
      details: updates,
    });

    res.json(device);
  } catch (err) { next(err); }
}

async function deleteDevice(req, res, next) {
  try {
    const device = await Device.findOneAndDelete({ deviceId: req.params.id, houseId: req.user.houseId });
    if (!device) return res.status(404).json({ error: "Device not found" });

    await Telemetry.deleteMany({ deviceId: req.params.id });

    await AuditLog.create({
      houseId: req.user.houseId, actor: req.user.sub, actorName: req.user.email,
      action: "DEVICE_DELETED", targetType: "device", targetId: req.params.id,
    });

    const io = req.app.get("io");
    if (io) io.to(req.user.houseId).emit("deviceRemoved", { deviceId: req.params.id });

    res.json({ message: "Device deleted" });
  } catch (err) { next(err); }
}

async function toggleDevice(req, res, next) {
  try {
    const device = await Device.findOne({ deviceId: req.params.id, houseId: req.user.houseId });
    if (!device) return res.status(404).json({ error: "Device not found" });

    device.enabled = !device.enabled;
    device.status = device.enabled ? "online" : "offline";
    if (!device.enabled) device.lastHeartbeat = new Date();
    await device.save();

    await AuditLog.create({
      houseId: req.user.houseId, actor: req.user.sub, actorName: req.user.email,
      action: device.enabled ? "DEVICE_ENABLED" : "DEVICE_DISABLED",
      targetType: "device", targetId: req.params.id,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(req.user.houseId).emit("deviceToggled", {
        deviceId:      device.deviceId,
        enabled:       device.enabled,
        status:        device.status,
        lastHeartbeat: device.lastHeartbeat,
      });
    }

    res.json(device);
  } catch (err) { next(err); }
}

async function heartbeat(req, res, next) {
  try {
    const device = await Device.findOneAndUpdate(
      { deviceId: req.params.id },
      { lastHeartbeat: new Date(), status: "online" },
      { new: true }
    );
    if (!device) return res.status(404).json({ error: "Device not found" });
    res.json({ ok: true, lastHeartbeat: device.lastHeartbeat });
  } catch (err) { next(err); }
}

async function getDeviceAudit(req, res, next) {
  try {
    const logs = await AuditLog.find({
      houseId: req.user.houseId,
      targetType: "device", targetId: req.params.id,
    }).sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) { next(err); }
}

async function getDeviceGraph(req, res, next) {
  try {
    const houseId = req.user?.houseId || req.query.houseId;
    const filter  = houseId ? { houseId } : {};
    const devices = await Device.find(filter).lean();

    const nodes = devices.map((d) => ({
      id:             d.deviceId,
      name:           d.name,
      type:           d.type,
      location:       d.location,
      status:         d.status,
      enabled:        d.enabled,
      signalStrength: d.telemetry?.signalStrength ?? -70,
      latency:        d.telemetry?.latency ?? 50,
      packetLoss:     d.telemetry?.packetLoss ?? 5,
    }));

    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const weight = connectivityWeight(nodes[i], nodes[j]);
        if (weight >= 20) edges.push({ source: nodes[i].id, target: nodes[j].id, weight });
      }
    }

    res.json({ nodes, edges });
  } catch (err) { next(err); }
}

module.exports = {
  getAllDevices, getDevice, getDeviceHistory,
  createDevice, updateDevice, deleteDevice,
  toggleDevice, heartbeat, getDeviceAudit, getDeviceGraph,
};
