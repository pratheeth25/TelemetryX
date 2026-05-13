const mongoose = require("mongoose");

const SMART_DEVICE_TYPES = [
  "smart_speaker",
  "smart_lights",
  "smart_camera",
  "smart_door_lock",
  "smart_tv",
  "robot_vacuum",
  "smart_doorbell",
  "smart_refrigerator",
  "sensor_motion",
  "sensor_smoke",
  "sensor_water",
  "sensor_air",
];

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    name:     { type: String, required: true },
    location: { type: String, default: "Unknown" },   // room/area within the house
    type: {
      type: String,
      enum: SMART_DEVICE_TYPES,
      default: "smart_speaker",
    },
    status:  { type: String, enum: ["online", "offline"], default: "online" },
    enabled: { type: Boolean, default: true },

    houseId: { type: String, required: true, index: true },

    firmwareVersion: { type: String, default: "1.0.0" },
    group:           { type: String, default: "default" },
    lastHeartbeat:   { type: Date,   default: null },
    registeredBy:    { type: String, default: "system" }, // userId or "system"
    description:     { type: String, default: "" },
    tags:            { type: [String], default: [] },

    settings: { type: mongoose.Schema.Types.Mixed, default: {} },

    telemetry: {
      temperature:    { type: Number, default: 0 },
      battery:        { type: Number, default: 100 },
      signalStrength: { type: Number, default: -50 },
      latency:        { type: Number, default: 10 },
      packetLoss:     { type: Number, default: 0 },
      updatedAt:      { type: Date,   default: Date.now },
    },
  },
  { timestamps: true }
);

deviceSchema.index({ name: "text", location: "text", group: "text" });

module.exports = mongoose.model("Device", deviceSchema);
module.exports.SMART_DEVICE_TYPES = SMART_DEVICE_TYPES;
