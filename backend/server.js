const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser()); // Crucial for reading HTTP-only cookies
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // Crucial for allowing cookies across origins
  }),
);

// 2. Define your rate limiter configuration here
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per window
  message: {
    message:
      "Too many login attempts from this IP, please try again after 15 minutes",
  }, // Match your error handler format
});

// 3. Apply the limiter specifically to your login route
app.use("/api/auth/login", loginLimiter);

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const leadRoutes = require("./routes/leadRoutes");
const dealRoutes = require("./routes/dealRoutes");
const activityRoutes = require("./routes/activityRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes); // Contains the Admin-only aggregation route
app.use("/api/leads", leadRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/activities", activityRoutes);

// Central error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ message: err.message || "Server Error" });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() =>
    app.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`),
    ),
  )
  .catch((err) => console.error(err));
