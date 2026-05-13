const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },

    refreshToken:       { type: String, default: null },
    refreshTokenExpiry: { type: Date,   default: null },

    lastLogin: { type: Date,    default: null },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
