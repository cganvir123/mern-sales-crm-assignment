const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified"],
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

module.exports = mongoose.model("Lead", leadSchema);
