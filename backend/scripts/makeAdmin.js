// Promotes an existing account to Admin.
// Usage (from the backend folder):  node scripts/makeAdmin.js someone@example.com
//
// Public registration now always creates Sales Users, so this is how you
// create your first Admin: register normally, then run this script once.
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const User = require("../models/User");

const run = async () => {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: node scripts/makeAdmin.js <email>");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate(
      { email },
      // Bumping tokenVersion logs them out everywhere, so their next
      // login gets a token with the new role
      { role: "Admin", $inc: { tokenVersion: 1 } },
      { new: true },
    );

    if (!user) {
      console.error(`No user found with email ${email}. Register first.`);
      process.exit(1);
    }

    console.log(`${user.name} <${user.email}> is now an Admin.`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to promote user:", error);
    process.exit(1);
  }
};

run();
