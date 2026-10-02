const jwt = require("jsonwebtoken");
const cookieOptions = require("./cookieOptions");

const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// The refresh cookie is only sent to /api/auth/* (refresh + logout),
// not with every API request like the access cookie.
const refreshCookieOptions = { ...cookieOptions, path: "/api/auth" };

const createAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });

const createRefreshToken = (user) =>
  jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion || 0 },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );

const setAuthCookies = (res, user) => {
  res.cookie("accessToken", createAccessToken(user), {
    ...cookieOptions,
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookie("refreshToken", createRefreshToken(user), {
    ...refreshCookieOptions,
    maxAge: REFRESH_MAX_AGE,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", refreshCookieOptions);
  // Older logins stored the refresh cookie on path "/", clear that one too
  res.clearCookie("refreshToken", cookieOptions);
};

module.exports = { setAuthCookies, clearAuthCookies };
