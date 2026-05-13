const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    houseId: { type: String, required: true }, // House._id.toString()
    role: {
      type:     String,
      enum:     ["admin", "operator", "viewer"],
      required: true,
    },
    invitedBy: { type: String, default: null },
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, houseId: 1 }, { unique: true });
membershipSchema.index({ houseId: 1 });

module.exports = mongoose.model("Membership", membershipSchema);
