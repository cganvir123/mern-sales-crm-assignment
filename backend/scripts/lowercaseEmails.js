// One-time migration: lowercases existing user and lead emails.
// Usage (from the backend folder):  node scripts/lowercaseEmails.js
// Stops without changing anything if two users would end up with the same email.
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const users = db.collection("users");

    // 1. Find accounts that only differ by case
    const duplicates = await users
      .aggregate([
        {
          $group: {
            _id: { $toLower: "$email" },
            count: { $sum: 1 },
            emails: { $push: "$email" },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    if (duplicates.length) {
      console.error(
        "These accounts clash when lowercased. Merge or delete one of each pair, then re-run:",
      );
      duplicates.forEach((d) => console.error("  ", d.emails.join("  <->  ")));
      process.exit(1);
    }

    // 2. Lowercase + trim (update pipeline, needs MongoDB 4.2+)
    const fix = [
      { $set: { email: { $toLower: { $trim: { input: "$email" } } } } },
    ];
    const u = await users.updateMany({}, fix);
    const l = await db.collection("leads").updateMany({}, fix);

    console.log(
      `Updated ${u.modifiedCount} users and ${l.modifiedCount} leads.`,
    );
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

run();
