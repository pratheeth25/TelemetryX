const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || "access_dev_secret_change_in_prod";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_dev_secret_change_in_prod";
const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || "15m";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

function signAccessToken({ userId, email, houseId, role }) {
  return jwt.sign(
    { sub: userId.toString(), email, role, houseId },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
}

function signRefreshToken(userId) {
  return jwt.sign(
    { sub: userId.toString() },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueTokens(user, tokenOpts, res) {
  const accessToken  = signAccessToken({ userId: user._id, email: user.email, ...tokenOpts });
  const refreshToken = signRefreshToken(user._id);

  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.refreshToken       = hashToken(refreshToken);
  user.refreshTokenExpiry = expiry;
  user.lastLogin          = new Date();
  await user.save();

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });

  return accessToken;
}

async function revokeTokens(userId, res) {
  await User.findByIdAndUpdate(userId, {
    refreshToken: null,
    refreshTokenExpiry: null,
  });
  res.clearCookie("refreshToken");
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  issueTokens,
  revokeTokens,
};
