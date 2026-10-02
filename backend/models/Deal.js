const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    stage: {
      type: String,
      enum: ["Prospect", "Negotiation", "Won", "Lost"], // Required deal stages
      default: "Prospect",
    },
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
