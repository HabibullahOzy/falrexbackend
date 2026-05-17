// const jwt = require("jsonwebtoken");

// const verifyJWT = (req, res, next) => {
//   try {
//     // Check cookie first, then Authorization header
//     const token =
//       req.cookies?.auth_token ||
//       req.headers.authorization?.split("Bearer ")[1];

//     if (!token) {
//       return res.status(401).json({ success: false, message: "Not authenticated" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.status(401).json({ success: false, message: "Invalid or expired token" });
//   }
// };

// // Role guard middleware
// const requireRole = (...roles) => (req, res, next) => {
//   if (!req.user) {
//     return res.status(401).json({ success: false, message: "Not authenticated" });
//   }
//   if (!roles.includes(req.user.role)) {
//     return res.status(403).json({ success: false, message: "Insufficient permissions" });
//   }
//   next();
// };

// module.exports = { verifyJWT, requireRole };


const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── Main JWT verify ────────────────────────────────────────────────────────
exports.verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.auth_token ||
      req.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code:    "NO_TOKEN",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findOne({ uid: decoded.uid }).select("-__v");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found",
        code:    "USER_NOT_FOUND",
      });
    }

    if (user.status === "banned") {
      return res.status(403).json({
        success: false,
        message: "Account suspended. Contact support.",
        code:    "ACCOUNT_BANNED",
      });
    }

    req.user = {
      uid:          user.uid,
      email:        user.email,
      firstName:    user.firstName,
      lastName:     user.lastName,
      role:         user.role,
      status:       user.status,
      avatar:       user.avatar,
      phone:        user.phone,
      sellerStatus: user.sellerStatus,
      sellerProfile:user.sellerProfile,
      createdAt:    user.createdAt,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code:    "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      code:    "INVALID_TOKEN",
    });
  }
};

// ── Optional — attach user if token exists but don't block ────────────────
exports.optionalAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.auth_token ||
      req.headers?.authorization?.replace("Bearer ", "");

    if (!token) { req.user = null; return next(); }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findOne({ uid: decoded.uid });
    req.user      = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

// ── Role guard ────────────────────────────────────────────────────────────
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(" or ")}`,
      code:    "FORBIDDEN",
    });
  }
  next();
};

// ── Approved seller guard ─────────────────────────────────────────────────
exports.requireApprovedSeller = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  const { role, sellerStatus } = req.user;
  if (!["seller", "admin", "super_admin"].includes(role)) {
    return res.status(403).json({ success: false, message: "Sellers only" });
  }
  if (role === "seller" && sellerStatus !== "approved") {
    return res.status(403).json({
      success: false,
      message: "Your seller account is pending approval.",
      code:    "SELLER_PENDING",
    });
  }
  next();
};