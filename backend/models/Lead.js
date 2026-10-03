const mongoose = require("mongoose");
const { LEAD_STATUSES, LEAD_SOURCES } = require("../utils/constants");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: { type: String, enum: LEAD_SOURCES },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "New",
    },
    // This is the crucial link for data isolation
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Nearly every lead query filters by owner and sorts newest first
leadSchema.index({ assignedTo: 1, createdAt: -1 });

module.exports = mongoose.model("Lead", leadSchema);
