const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const token = req.cookies.accessToken; // Read from cookie

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded; // Attach { id, role } to the request
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          message: `Role ${req.user.role} is not authorized to access this route`,
        });
    }
    next();
  };
};

module.exports = { protect, authorize };
