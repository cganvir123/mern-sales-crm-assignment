const mongoose = require("mongoose");
require("dotenv").config();

const clearDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Directly drop collections for a clean slate
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
