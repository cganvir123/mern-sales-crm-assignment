const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // "Rahul@X.com" and "rahul@x.com" are the same account
      trim: true,
    },
    password: { type: String, required: true }, // bcrypt hash
    role: {
      type: String,
      enum: ["Admin", "Sales User"],
      default: "Sales User",
      required: true,
    },
    // Copied into every refresh token. Incrementing it makes all existing
    // refresh tokens for this user invalid (logout, role change, etc.)
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
