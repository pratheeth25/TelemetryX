const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    houseId:    { type: String, required: true, index: true },
    deviceId:   { type: String, required: true },
    deviceName: { type: String },
    type: {
      type: String,
      enum: ["HIGH_TEMP", "LOW_BATTERY", "DEVICE_OFFLINE"],
      required: true,
    },
    message:      { type: String, required: true },
    severity:     { type: String, enum: ["warning", "critical"], default: "warning" },
    acknowledged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);
