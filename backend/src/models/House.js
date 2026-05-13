const mongoose = require("mongoose");
const crypto   = require("crypto");

function generateActivationCode(length = 8) {
  return crypto.randomBytes(length * 2)
    .toString("base64")
    .replace(/[^A-Z0-9]/gi, "")
    .substring(0, length)
    .toUpperCase();
}

const houseSchema = new mongoose.Schema(
  {
    houseNumber:    { type: String, required: true, unique: true, uppercase: true, index: true },
    houseName:      { type: String, required: true, trim: true },
    activationCode: { type: String, required: true },
    ownerId:        { type: String, default: null },
    isSeeded:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("House", houseSchema);
module.exports.generateActivationCode = generateActivationCode;
