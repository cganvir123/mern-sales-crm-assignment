// Deletes ALL leads, deals and activities (users are kept).
// Usage: node dbClear.js --yes
const mongoose = require("mongoose");
require("dotenv").config();

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to clear the database: NODE_ENV is production.");
  process.exit(1);
}

if (!process.argv.includes("--yes")) {
  console.error(
    `This deletes every lead, deal and activity in:\n  ${process.env.MONGO_URI}\n` +
      "Run again with --yes to confirm:  node dbClear.js --yes",
  );
  process.exit(1);
}

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    await db.collection("leads").deleteMany({});
    await db.collection("deals").deleteMany({});
    await db.collection("activities").deleteMany({});

    console.log("Database collections truncated successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing database:", error);
    process.exit(1);
  }
};

clearDatabase();
