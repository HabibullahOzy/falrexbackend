const jwt = require("jsonwebtoken");

const verifyJWT = (req, res, next) => {
  try {
    // 1. Cookie (same-origin / production)
    // 2. Authorization: Bearer <token> (cross-origin dev fallback)
    const token =
      req.cookies?.auth_token ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// Role guard — call after verifyJWT
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Insufficient permissions" });
  }
  next();
};

module.exports = { verifyJWT, requireRole };