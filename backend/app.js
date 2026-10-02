const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Render/Vercel sit behind a proxy. Without this, every request appears to
// come from the proxy's IP, so the login limiter would lock out ALL users
// after 5 attempts combined.
if (isProd) {
  app.set("trust proxy", 1);
}

// Security headers (X-Content-Type-Options, HSTS, no X-Powered-By, ...)
app.use(
  helmet({
    // This is a JSON API used from another domain (Vercel), so allow
    // cross-origin use of its responses; CORS still controls who can call it.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Middleware
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser()); // Crucial for reading HTTP-only cookies

// Allowed origins come from FRONTEND_URL (comma-separated) so you don't
// have to edit code when the deployed URL changes.
const allowedOrigins = (
  process.env.FRONTEND_URL ||
  "http://localhost:5173,https://mern-sales-crm-assignment.vercel.app"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Required because the frontend sends cookies
    // PATCH was missing before, which broke lead-status and deal-stage
    // updates cross-origin in production
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed login attempts per IP per window
  skipSuccessfulRequests: true, // Successful logins don't count against the limit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many login attempts from this IP, please try again after 15 minutes",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many accounts created from this IP, please try again later",
  },
});

// General limit for the whole API, so one client can't hammer the server
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down" },
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const leadRoutes = require("./routes/leadRoutes");
const dealRoutes = require("./routes/dealRoutes");
const activityRoutes = require("./routes/activityRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes); // Admin-only
app.use("/api/leads", leadRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Unknown API routes return JSON instead of Express's default HTML page
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Central error handler
app.use((err, req, res, next) => {
  // Invalid ObjectId in a URL or body, e.g. GET /api/leads/abc
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }

  // Schema validation failure (enum, required, min, ...)
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ message });
  }

  // Unique index violation (e.g. two users registering the same email at once)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: `That ${field} is already in use` });
  }

  // Malformed JSON body
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON in request body" });
  }

  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) console.error(err);

  res.status(statusCode).json({
    // Don't leak internal error details to clients in production
    message:
      statusCode >= 500 && isProd
        ? "Server Error"
        : err.message || "Server Error",
  });
});

module.exports = app;
