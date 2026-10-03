const mongoose = require("mongoose");
const { DEAL_STAGES } = require("../utils/constants");

const dealSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    stage: {
      type: String,
      enum: DEAL_STAGES,
      default: "Prospect",
    },
    // Optional: when the deal is expected to close
    expectedCloseDate: { type: Date },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
  },
  { timestamps: true },
);

dealSchema.index({ leadId: 1 });

module.exports = mongoose.model("Deal", dealSchema);
