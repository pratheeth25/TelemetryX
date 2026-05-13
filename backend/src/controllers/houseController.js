const House      = require("../models/House");
const Membership = require("../models/Membership");
const Device     = require("../models/Device");
const AuditLog   = require("../models/AuditLog");

async function getHouse(req, res, next) {
  try {
    const house = await House.findById(req.user.houseId);
    if (!house) return res.status(404).json({ error: "House not found" });

    const memberCount = await Membership.countDocuments({ houseId: req.user.houseId });
    const deviceCount = await Device.countDocuments({ houseId: req.user.houseId });

    res.json({ house: { ...house.toObject(), memberCount, deviceCount } });
  } catch (err) { next(err); }
}

async function updateHouse(req, res, next) {
  try {
    const { houseName } = req.body;
    if (!houseName) return res.status(400).json({ error: "houseName is required" });

    const house = await House.findByIdAndUpdate(
      req.user.houseId,
      { houseName },
      { new: true }
    );
    if (!house) return res.status(404).json({ error: "House not found" });

    await AuditLog.create({
      houseId: req.user.houseId,
      actor: req.user.sub, actorName: req.user.email,
      action: "HOUSE_UPDATED",
      targetType: "house", targetId: house._id.toString(),
      details: { houseName },
    });

    res.json({ house });
  } catch (err) { next(err); }
}

module.exports = { getHouse, updateHouse };
