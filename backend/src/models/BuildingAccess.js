const mongoose = require("mongoose");

const buildingAccessSchema = new mongoose.Schema(
  {
    userId:         { type: String, required: true },
    buildingId:     { type: String, required: true },
    permissionType: { type: String, enum: ["view"], default: "view" },
    grantedBy:      { type: String, required: true },
    grantedByName:  { type: String, default: "" },
  },
  { timestamps: true }
);

buildingAccessSchema.index({ userId: 1, buildingId: 1 }, { unique: true });

module.exports = mongoose.model("BuildingAccess", buildingAccessSchema);
