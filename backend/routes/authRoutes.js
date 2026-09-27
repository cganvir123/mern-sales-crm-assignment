const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // <-- NEW: Import the User model
const cookieOptions = require("../utils/cookieOptions"); // <-- NEW: shared cookie settings
const { login, register, logout } = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
} = require("../middleware/validationMiddleware");

// Register route with input validation
router.post("/register", validateRegister, register);

// Login route with input validation
router.post("/login", validateLogin, login);

router.post("/logout", logout);

// Refresh token route
router.post("/refresh", async (req, res) => {
  // <-- NEW: Make function async
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // <-- NEW: Fetch the user from the database to get their actual role
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // <-- NEW: Issue a new access token using the fetched user role
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" },
    );

    // Use the SAME environment-aware options as login
    // (was sameSite: "strict", which blocks the cookie cross-site in production)
    res.cookie("accessToken", newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ message: "Token refreshed" });
  } catch (error) {
    res.status(403).json({ message: "Invalid refresh token" });
  }
});

module.exports = router;
