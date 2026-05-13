const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    houseId:    { type: String, index: true },
    actor:      { type: String, required: true },
    actorName:  { type: String },
    action:     { type: String, required: true },
    targetType: { type: String },
    targetId:   { type: String },
    details:    { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
