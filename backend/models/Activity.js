const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Calls", "Meetings", "Notes", "Follow-ups"], // Required activity types
      required: true,
    },
    notes: { type: String, required: true, trim: true },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
  },
  { timestamps: true },
);

activitySchema.index({ leadId: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);
