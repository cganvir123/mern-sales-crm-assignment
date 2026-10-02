const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { setAuthCookies, clearAuthCookies } = require("../utils/tokens");

// Used when the email doesn't exist, so a failed login takes the same time
// whether or not the account exists (prevents email discovery by timing).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

// Only the fields the frontend needs
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const register = async (req, res, next) => {
  try {
    // "role" is deliberately NOT read from the body. Public sign-up always
    // creates a Sales User. Use scripts/makeAdmin.js to promote an account.
    const { name, email, password } = req.body; // email is lowercased by the validator

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "Sales User",
    });

    res.status(201).json({
      message: "User registered successfully",
      user: publicUser(newUser),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    // Always run bcrypt, even if the user doesn't exist
    const passwordOk = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_HASH,
    );

    if (!user || !passwordOk) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    setAuthCookies(res, user);
    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// Issues a new access token (and a fresh refresh token, so active users
// stay logged in) as long as the refresh token hasn't been revoked.
const refresh = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);

    // tokenVersion mismatch = user logged out / was revoked after this token was issued
    if (!user || (decoded.tokenVersion || 0) !== user.tokenVersion) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Session expired" });
    }

    setAuthCookies(res, user);
    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    clearAuthCookies(res);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        // Revoke every refresh token issued to this user so far
        await User.updateOne(
          { _id: decoded.id },
          { $inc: { tokenVersion: 1 } },
        );
      } catch {
        // Expired/invalid token: nothing to revoke, just clear the cookies
      }
    }

    clearAuthCookies(res);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// Returns the logged-in user from the database (source of truth for the UI)
const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(401).json({ message: "User no longer exists" });
    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, refresh, logout, me };
