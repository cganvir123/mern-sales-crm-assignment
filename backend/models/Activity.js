const mongoose = require("mongoose");
const { ACTIVITY_TYPES } = require("../utils/constants");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
    },
    notes: { type: String, required: true, trim: true },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    // Who logged it (activities created before this field existed won't have it)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // --- Follow-ups only: they work as tasks ---
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

activitySchema.index({ leadId: 1, createdAt: -1 });
// Open follow-ups by due date (dashboard task list, overdue badges)
activitySchema.index({ type: 1, completed: 1, dueDate: 1 });

module.exports = mongoose.model("Activity", activitySchema);
