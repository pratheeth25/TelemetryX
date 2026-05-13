const bcrypt     = require("bcryptjs");
const User       = require("../models/User");
const House      = require("../models/House");
const Membership = require("../models/Membership");
const AuditLog   = require("../models/AuditLog");
const { issueTokens, revokeTokens, verifyRefreshToken, hashToken } = require("../services/authService");

async function buildMembershipList(userId) {
  const memberships = await Membership.find({ userId }).lean();
  const houseIds    = memberships.map((m) => m.houseId);
  const houses      = await House.find({ _id: { $in: houseIds } }).lean();
  const houseMap    = Object.fromEntries(houses.map((h) => [h._id.toString(), h]));
  return memberships.map((m) => ({
    houseId:     m.houseId,
    houseNumber: houseMap[m.houseId]?.houseNumber ?? "?",
    houseName:   houseMap[m.houseId]?.houseName   ?? "Unknown",
    role:        m.role,
  }));
}

async function buildAuthResponse(user, membership, house, res) {
  const accessToken    = await issueTokens(user, { houseId: membership.houseId, role: membership.role }, res);
  const membershipList = await buildMembershipList(user._id);
  return { accessToken, user, house, role: membership.role, memberships: membershipList };
}

async function register(req, res, next) {
  try {
    const { name, email, password, houseNumber, activationCode } = req.body;
    if (!name || !email || !password || !houseNumber || !activationCode) {
      return res.status(400).json({ error: "name, email, password, houseNumber and activationCode are required" });
    }

    const house = await House.findOne({ houseNumber: houseNumber.toUpperCase() });
    if (!house) return res.status(404).json({ error: `House ${houseNumber} not found` });

    if (house.activationCode !== activationCode.toUpperCase()) {
      return res.status(401).json({ error: "Invalid activation code" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hasAdmin = await Membership.exists({ houseId: house._id.toString(), role: "admin" });
    const role     = hasAdmin ? "viewer" : "admin";

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    await Membership.create({ userId: user._id, houseId: house._id.toString(), role, invitedBy: null });

    if (role === "admin") { house.ownerId = user._id.toString(); await house.save(); }

    await AuditLog.create({
      houseId: house._id.toString(), actor: user._id.toString(), actorName: name,
      action: role === "admin" ? "ADMIN_REGISTERED" : "MEMBER_REGISTERED",
      targetType: "user", targetId: user._id.toString(),
      details: { email, role, houseNumber: house.houseNumber },
    });

    const payload = await buildAuthResponse(user, { houseId: house._id.toString(), role }, house, res);
    res.status(201).json(payload);
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password, houseNumber } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const memberships = await Membership.find({ userId: user._id }).lean();
    if (memberships.length === 0) return res.status(403).json({ error: "No house membership found." });

    let activeMembership = memberships[0];
    if (houseNumber) {
      const h = await House.findOne({ houseNumber: houseNumber.toUpperCase() });
      if (h) {
        const match = memberships.find((m) => m.houseId === h._id.toString());
        if (match) activeMembership = match;
      }
    }

    const house = await House.findById(activeMembership.houseId);
    await AuditLog.create({
      houseId: activeMembership.houseId, actor: user._id.toString(), actorName: user.name,
      action: "LOGIN", targetType: "user", targetId: user._id.toString(), details: {},
    });

    const payload = await buildAuthResponse(user, { houseId: activeMembership.houseId, role: activeMembership.role }, house, res);
    res.json(payload);
  } catch (err) { next(err); }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    let payload;
    try { payload = verifyRefreshToken(token); }
    catch { return res.status(401).json({ error: "Invalid refresh token" }); }

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ error: "User not found" });
    if (user.refreshToken !== hashToken(token)) return res.status(401).json({ error: "Refresh token reuse detected" });
    if (user.refreshTokenExpiry < new Date()) return res.status(401).json({ error: "Refresh token expired" });

    const membership = await Membership.findOne({ userId: user._id }).lean();
    if (!membership) return res.status(403).json({ error: "No membership found" });

    const house = await House.findById(membership.houseId);
    const authPayload = await buildAuthResponse(user, { houseId: membership.houseId, role: membership.role }, house, res);
    res.json(authPayload);
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try { await revokeTokens(req.user.sub, res); res.json({ message: "Logged out" }); }
  catch (err) { next(err); }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found" });
    const membership     = await Membership.findOne({ userId: user._id, houseId: req.user.houseId }).lean();
    const house          = await House.findById(req.user.houseId);
    const membershipList = await buildMembershipList(user._id);
    res.json({ user, house, role: membership?.role ?? req.user.role, memberships: membershipList });
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const { name, password } = req.body;
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (name)     user.name         = name.trim();
    if (password) user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    res.json({ user });
  } catch (err) { next(err); }
}

async function listUsers(req, res, next) {
  try {
    const houseId = req.user.houseId;
    const memberships = await Membership.find({ houseId }).populate("userId", "-passwordHash -refreshToken").lean();
    const users = memberships.map((m) => ({
      ...(m.userId ? (typeof m.userId.toObject === "function" ? m.userId.toObject() : m.userId) : {}),
      role: m.role, membershipId: m._id,
    }));
    res.json({ users });
  } catch (err) { next(err); }
}

async function updateUserRole(req, res, next) {
  try {
    const { id }   = req.params;
    const { role } = req.body;
    if (!["admin", "operator", "viewer"].includes(role)) {
      return res.status(400).json({ error: "role must be admin, operator, or viewer" });
    }
    const membership = await Membership.findOneAndUpdate(
      { userId: id, houseId: req.user.houseId }, { role }, { new: true }
    );
    if (!membership) return res.status(404).json({ error: "Member not found in this house" });
    if (role === "admin") await House.findByIdAndUpdate(req.user.houseId, { ownerId: id });
    await AuditLog.create({
      houseId: req.user.houseId, actor: req.user.sub, actorName: req.user.email,
      action: "ROLE_CHANGED", targetType: "user", targetId: id, details: { newRole: role },
    });
    res.json({ membership });
  } catch (err) { next(err); }
}

async function deactivateUser(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user.sub) return res.status(400).json({ error: "You cannot remove yourself" });
    const removed = await Membership.findOneAndDelete({ userId: id, houseId: req.user.houseId });
    if (!removed) return res.status(404).json({ error: "Member not found in this house" });
    await AuditLog.create({
      houseId: req.user.houseId, actor: req.user.sub, actorName: req.user.email,
      action: "MEMBER_REMOVED", targetType: "user", targetId: id, details: {},
    });
    res.json({ message: "Member removed from house" });
  } catch (err) { next(err); }
}

async function listHousesPublic(req, res, next) {
  try {
    const houses = await House.find({ isSeeded: true }, "houseNumber houseName ownerId").lean();
    res.json({ houses: houses.map((h) => ({ houseNumber: h.houseNumber, houseName: h.houseName, hasOwner: !!h.ownerId })) });
  } catch (err) { next(err); }
}

async function getHousePublic(req, res, next) {
  try {
    const house = await House.findOne({ houseNumber: req.params.houseNumber.toUpperCase(), isSeeded: true }).lean();
    if (!house) return res.status(404).json({ error: "House not found" });
    res.json({ houseNumber: house.houseNumber, houseName: house.houseName, hasOwner: !!house.ownerId });
  } catch (err) { next(err); }
}

module.exports = {
  register, login, refresh, logout,
  me, updateProfile, listUsers, updateUserRole, deactivateUser,
  listHousesPublic, getHousePublic,
};
