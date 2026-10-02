const mongoose = require("mongoose");
require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Fail fast if required settings are missing, instead of failing on first login
for (const key of [
  "MONGO_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err);
    process.exit(1); // Non-zero exit so Render/nodemon show it as a crash
  });
