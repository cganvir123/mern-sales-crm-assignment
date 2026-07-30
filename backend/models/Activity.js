const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Calls", "Meetings", "Notes", "Follow-ups"], // Required activity types
      required: true,
    },
    notes: { type: String, required: true },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Activity", activitySchema);
