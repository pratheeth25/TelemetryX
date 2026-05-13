const mongoose = require("mongoose");

const telemetrySchema = new mongoose.Schema(
  {
    houseId:        { type: String, index: true },
    deviceId:       { type: String, required: true, index: true },
    temperature:    Number,
    battery:        Number,
    signalStrength: Number,
    latency:        Number,
    packetLoss:     Number,
    status:         { type: String, enum: ["online", "offline"] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Telemetry", telemetrySchema);
