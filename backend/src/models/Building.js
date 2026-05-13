const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

const BUILDING_TYPES = [
  "House",
  "Office",
  "Factory",
  "Warehouse",
  "Apartment",
  "Hospital",
  "School",
  "Custom",
];

const buildingSchema = new mongoose.Schema(
  {
    buildingId: {
      type: String,
      required: true,
      unique: true,
      default: () => `bld-${nanoid(8).toLowerCase()}`,
    },
    name:        { type: String, required: true, trim: true },
    buildingType:{ type: String, enum: BUILDING_TYPES, default: "House" },
    address:     { type: String, default: "" },
    description: { type: String, default: "" },
    ownerId:     { type: String, required: true },
    ownerName:   { type: String, default: "" },
  },
  { timestamps: true }
);

buildingSchema.index({ name: "text", address: "text" });

module.exports = mongoose.model("Building", buildingSchema);
module.exports.BUILDING_TYPES = BUILDING_TYPES;
