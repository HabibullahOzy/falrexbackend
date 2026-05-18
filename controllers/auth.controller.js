// // const jwt = require("jsonwebtoken");
// // const admin = require("../config/firebaseAdmin");
// // const User = require("../models/User");

// // // ── Helper: issue JWT ────────────────────────────────────────────────────────
// // function issueJWT(user) {
// //   return jwt.sign(
// //     {
// //       uid: user.uid,
// //       email: user.email,
// //       firstName: user.firstName,
// //       lastName: user.lastName,
// //       role: user.role,
// //       sellerStatus: user.sellerStatus,
// //     },
// //     process.env.JWT_SECRET,
// //     { expiresIn: "7d" }
// //   );
// // }

// // // ── Helper: set JWT cookie ────────────────────────────────────────────────────
// // function setJWTCookie(res, token) {
// //   res.cookie("auth_token", token, {
// //     httpOnly: true,
// //     secure: process.env.NODE_ENV === "production",
// //     sameSite: "strict",
// //     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
// //   });
// // }

// // // ── REGISTER ──────────────────────────────────────────────────────────────────
// // // POST /auth/register
// // exports.register = async (req, res) => {
// //   try {
// //     const {
// //       firebaseToken,
// //       firstName, lastName, email, phone,
// //       role,
// //       // seller fields
// //       businessName, businessType, businessCategory,
// //       country, address, website, description,
// //       taxId, tradeLicense,
// //       authProvider,
// //     } = req.body;

// //     if (!firebaseToken) {
// //       return res.status(400).json({ success: false, message: "Firebase token required" });
// //     }

// //     // Verify Firebase token
// //     const decoded = await admin.auth().verifyIdToken(firebaseToken);

// //     // Check if already registered
// //     const existing = await User.findOne({ uid: decoded.uid });
// //     if (existing) {
// //       const token = issueJWT(existing);
// //       setJWTCookie(res, token);
// //       return res.json({
// //         success: true, token,
// //         user: sanitizeUser(existing),
// //         message: "Already registered",
// //       });
// //     }

// //     // Update Firebase display name
// //     await admin.auth().updateUser(decoded.uid, {
// //       displayName: `${firstName} ${lastName || ""}`.trim(),
// //     });

// //     // Build user document
// //     const userData = {
// //       uid: decoded.uid,
// //       email: email || decoded.email || "",
// //       firstName: firstName || "",
// //       lastName: lastName || "",
// //       phone: phone || decoded.phone_number || "",
// //       role: role === "seller" ? "seller" : "user",
// //       authProvider: authProvider || "email",
// //       isEmailVerified: decoded.email_verified || false,
// //       sellerStatus: role === "seller" ? "pending" : "none",
// //     };

// //     // Add seller profile
// //     if (role === "seller") {
// //       userData.sellerProfile = {
// //         businessName: businessName || "",
// //         businessType: businessType || "",
// //         businessCategory: businessCategory || "",
// //         country: country || "",
// //         address: address || "",
// //         website: website || "",
// //         description: description || "",
// //         taxId: taxId || "",
// //         tradeLicense: tradeLicense || "",
// //       };
// //     }

// //     const newUser = await User.create(userData);
// //     const token = issueJWT(newUser);
// //     setJWTCookie(res, token);

// //     return res.status(201).json({
// //       success: true,
// //       token,
// //       user: sanitizeUser(newUser),
// //       message: role === "seller"
// //         ? "Seller account created. Pending verification."
// //         : "Account created successfully.",
// //     });

// //   } catch (err) {
// //     console.error("Register error:", err);
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };

// // // ── LOGIN / ISSUE JWT ─────────────────────────────────────────────────────────
// // // POST /auth/login
// // // exports.login = async (req, res) => {
// // //   try {
// // //     const { firebaseToken } = req.body;

// // //     if (!firebaseToken) {
// // //       return res.status(400).json({ success: false, message: "Firebase token required" });
// // //     }

// // //     // Verify Firebase token
// // //     const decoded = await admin.auth().verifyIdToken(firebaseToken);

// // //     // Find user in DB
// // //     let user = await User.findOneAndUpdate(
// // //       { uid: decoded.uid },
// // //       { lastLoginAt: new Date() },
// // //       { new: true }
// // //     );

// // //     // Auto-create for Google/Phone users who aren't in DB yet
// // //     if (!user) {
// // //       user = await User.create({
// // //         uid: decoded.uid,
// // //         email: decoded.email || null,  // ← null instead of ""
// // //         firstName: decoded.name?.split(" ")[0] || "User",
// // //         lastName: decoded.name?.split(" ").slice(1).join(" ") || "",
// // //         role: "user",
// // //         authProvider: decoded.firebase?.sign_in_provider?.includes("google") ? "google" : "phone",
// // //         isEmailVerified: decoded.email_verified || false,
// // //         sellerStatus: "none",
// // //         lastLoginAt: new Date(),
// // //       });
// // //     }

// // //     if (!user.isActive) {
// // //       return res.status(403).json({ success: false, message: "Account suspended." });
// // //     }

// // //     const token = issueJWT(user);
// // //     setJWTCookie(res, token);

// // //     return res.json({
// // //       success: true,
// // //       token,
// // //       user: sanitizeUser(user),
// // //     });

// // //   } catch (err) {
// // //     console.error("Login error:", err);
// // //     return res.status(500).json({ success: false, message: err.message });
// // //   }
// // // };

// // exports.login = async (req, res) => {
// //   try {
// //     const { firebaseToken } = req.body;

// //     if (!firebaseToken)
// //       return res.status(400).json({ success: false, message: "Firebase token required" });

// //     const decoded = await admin.auth().verifyIdToken(firebaseToken);

// //     // ✅ Search by uid OR email to avoid duplicate create
// //     let user = await User.findOneAndUpdate(
// //       { $or: [{ uid: decoded.uid }, { email: decoded.email || null }] },
// //       { lastLoginAt: new Date(), uid: decoded.uid },
// //       { returnDocument: 'after' }
// //     );

// //     if (!user) {
// //       user = await User.create({
// //         uid:             decoded.uid,
// //         email:           decoded.email || null,
// //         firstName:       decoded.name?.split(" ")[0] || "User",
// //         lastName:        decoded.name?.split(" ").slice(1).join(" ") || "",
// //         role:            "user",
// //         authProvider:    decoded.firebase?.sign_in_provider?.includes("google") ? "google" : "phone",
// //         isEmailVerified: decoded.email_verified || false,
// //         sellerStatus:    "none",
// //         lastLoginAt:     new Date(),
// //       });
// //     }

// //     if (!user.isActive)
// //       return res.status(403).json({ success: false, message: "Account suspended." });

// //     const token = issueJWT(user);
// //     setJWTCookie(res, token);

// //     return res.json({ success: true, token, user: sanitizeUser(user) });

// //   } catch (err) {
// //     console.error("Login error:", err);
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };



// // // ── GET CURRENT USER ──────────────────────────────────────────────────────────
// // // GET /auth/me   (requires JWT)
// // exports.getMe = async (req, res) => {
// //   try {
// //     const user = await User.findOne({ uid: req.user.uid });
// //     if (!user) {
// //       return res.status(404).json({ success: false, message: "User not found" });
// //     }
// //     return res.json({ success: true, user: sanitizeUser(user) });
// //   } catch (err) {
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };

// // // ── LOGOUT ────────────────────────────────────────────────────────────────────
// // // POST /auth/logout
// // exports.logout = (req, res) => {
// //   res.clearCookie("auth_token", { path: "/" });
// //   return res.json({ success: true, message: "Logged out" });
// // };

// // // ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
// // // POST /auth/refresh
// // exports.refreshToken = async (req, res) => {
// //   try {
// //     const { firebaseToken } = req.body;
// //     const decoded = await admin.auth().verifyIdToken(firebaseToken);

// //     const user = await User.findOneAndUpdate(
// //       { uid: decoded.uid },
// //       { lastLoginAt: new Date() },
// //       { new: true }
// //     );

// //     if (!user) return res.status(404).json({ success: false, message: "User not found" });

// //     const token = issueJWT(user);
// //     setJWTCookie(res, token);
// //     return res.json({ success: true, token, user: sanitizeUser(user) });
// //   } catch (err) {
// //     return res.status(401).json({ success: false, message: err.message });
// //   }
// // };

// // // ── ADMIN: Get all users ──────────────────────────────────────────────────────
// // // GET /auth/users   (admin only)
// // exports.getAllUsers = async (req, res) => {
// //   try {
// //     const { role, sellerStatus, page = 1, limit = 20 } = req.query;
// //     const filter = {};
// //     if (role) filter.role = role;
// //     if (sellerStatus) filter.sellerStatus = sellerStatus;

// //     const users = await User.find(filter)
// //       .sort({ createdAt: -1 })
// //       .skip((page - 1) * limit)
// //       .limit(Number(limit))
// //       .select("-__v");

// //     const total = await User.countDocuments(filter);

// //     return res.json({ success: true, total, data: users.map(sanitizeUser) });
// //   } catch (err) {
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };

// // // ── ADMIN: Approve/Reject Seller ──────────────────────────────────────────────
// // // PUT /auth/seller/:uid/status
// // exports.updateSellerStatus = async (req, res) => {
// //   try {
// //     const { uid } = req.params;
// //     const { status, reason } = req.body; // status: "approved" | "rejected"

// //     if (!["approved", "rejected"].includes(status)) {
// //       return res.status(400).json({ success: false, message: "Invalid status" });
// //     }

// //     const update = {
// //       sellerStatus: status,
// //       isSellerVerified: status === "approved",
// //       sellerRejectedReason: status === "rejected" ? (reason || "") : "",
// //     };

// //     const user = await User.findOneAndUpdate({ uid }, update, { new: true });
// //     if (!user) return res.status(404).json({ success: false, message: "User not found" });

// //     return res.json({ success: true, user: sanitizeUser(user), message: `Seller ${status}` });
// //   } catch (err) {
// //     return res.status(500).json({ success: false, message: err.message });
// //   }
// // };

// // // ── Helper: remove sensitive fields ──────────────────────────────────────────
// // function sanitizeUser(user) {
// //   const obj = user.toObject ? user.toObject() : user;
// //   delete obj.__v;
// //   return obj;
// // }



// const jwt   = require("jsonwebtoken");
// const admin = require("../config/firebaseAdmin");
// const User  = require("../models/User");

// // ── Helper: issue JWT ────────────────────────────────────────────────────────
// function issueJWT(user) {
//   return jwt.sign(
//     {
//       uid:          user.uid,
//       email:        user.email,
//       firstName:    user.firstName,
//       lastName:     user.lastName,
//       role:         user.role,
//       sellerStatus: user.sellerStatus,
//     },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );
// }

// // ── Helper: set JWT cookie ────────────────────────────────────────────────────
// function setJWTCookie(res, token) {
//   res.cookie("auth_token", token, {
//     httpOnly: true,
//     secure:   process.env.NODE_ENV === "production",
//     sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//     // "none" + secure=true is required for cross-site cookies (Railway → localhost).
//     // "lax" is fine for same-site (both on same domain in production).
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });
// }

// // ── REGISTER ──────────────────────────────────────────────────────────────────
// // POST /auth/register
// exports.register = async (req, res) => {
//   try {
//     const {
//       firebaseToken,
//       firstName, lastName, email, phone,
//       role,
//       businessName, businessType, businessCategory,
//       country, address, website, description,
//       taxId, tradeLicense,
//       authProvider,
//     } = req.body;

//     if (!firebaseToken)
//       return res.status(400).json({ success: false, message: "Firebase token required" });

//     const decoded = await admin.auth().verifyIdToken(firebaseToken);

//     // Already registered? Issue new JWT and return
//     const existing = await User.findOne({ uid: decoded.uid });
//     if (existing) {
//       const token = issueJWT(existing);
//       setJWTCookie(res, token);
//       return res.json({
//         success: true, token,
//         user: sanitizeUser(existing),
//         message: "Already registered",
//       });
//     }

//     // Update Firebase display name
//     await admin.auth().updateUser(decoded.uid, {
//       displayName: `${firstName} ${lastName || ""}`.trim(),
//     });

//     const userData = {
//       uid:             decoded.uid,
//       email:           email || decoded.email || "",
//       firstName:       firstName || "",
//       lastName:        lastName  || "",
//       phone:           phone || decoded.phone_number || "",
//       role:            role === "seller" ? "seller" : "user",
//       authProvider:    authProvider || "email",
//       isEmailVerified: decoded.email_verified || false,
//       sellerStatus:    role === "seller" ? "pending" : "none",
//     };

//     if (role === "seller") {
//       userData.sellerProfile = {
//         businessName:     businessName     || "",
//         businessType:     businessType     || "",
//         businessCategory: businessCategory || "",
//         country:          country          || "",
//         address:          address          || "",
//         website:          website          || "",
//         description:      description      || "",
//         taxId:            taxId            || "",
//         tradeLicense:     tradeLicense     || "",
//       };
//     }

//     const newUser = await User.create(userData);
//     const token   = issueJWT(newUser);
//     setJWTCookie(res, token);

//     return res.status(201).json({
//       success: true,
//       token,
//       user: sanitizeUser(newUser),
//       message: role === "seller"
//         ? "Seller account created. Pending verification."
//         : "Account created successfully.",
//     });
//   } catch (err) {
//     console.error("Register error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // ── LOGIN ─────────────────────────────────────────────────────────────────────
// // POST /auth/login
// exports.login = async (req, res) => {
//   try {
//     const { firebaseToken } = req.body;

//     if (!firebaseToken)
//       return res.status(400).json({ success: false, message: "Firebase token required" });

//     const decoded = await admin.auth().verifyIdToken(firebaseToken);

//     // Match by uid OR email to avoid duplicates (e.g. Google re-auth)
//     let user = await User.findOneAndUpdate(
//       { $or: [{ uid: decoded.uid }, { email: decoded.email || null }] },
//       { lastLoginAt: new Date(), uid: decoded.uid },
//       { new: true }
//     );

//     // Auto-create for Google / Phone users not yet in DB
//     if (!user) {
//       const provider = decoded.firebase?.sign_in_provider || "";
//       user = await User.create({
//         uid:             decoded.uid,
//         email:           decoded.email || null,
//         firstName:       decoded.name?.split(" ")[0] || "User",
//         lastName:        decoded.name?.split(" ").slice(1).join(" ") || "",
//         role:            "user",
//         authProvider:    provider.includes("google") ? "google"
//                        : provider.includes("phone")  ? "phone"
//                        : "email",
//         isEmailVerified: decoded.email_verified || false,
//         sellerStatus:    "none",
//         lastLoginAt:     new Date(),
//       });
//     }

//     if (!user.isActive)
//       return res.status(403).json({ success: false, message: "Account suspended." });

//     const token = issueJWT(user);
//     setJWTCookie(res, token);

//     return res.json({ success: true, token, user: sanitizeUser(user) });
//   } catch (err) {
//     console.error("Login error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // ── GET CURRENT USER ──────────────────────────────────────────────────────────
// // GET /auth/me   — verifyJWT middleware populates req.user
// exports.getMe = async (req, res) => {
//   try {
//     // req.user is set by verifyJWT; contains uid from the JWT payload
//     const user = await User.findOne({ uid: req.user.uid }).select("-__v");
//     if (!user)
//       return res.status(404).json({ success: false, message: "User not found" });

//     return res.json({ success: true, user: sanitizeUser(user) });
//   } catch (err) {
//     console.error("getMe error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // ── LOGOUT ────────────────────────────────────────────────────────────────────
// // POST /auth/logout
// exports.logout = (req, res) => {
//   res.clearCookie("auth_token", {
//     httpOnly: true,
//     secure:   process.env.NODE_ENV === "production",
//     sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//     path:     "/",
//   });
//   return res.json({ success: true, message: "Logged out" });
// };

// // ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
// // POST /auth/refresh
// exports.refreshToken = async (req, res) => {
//   try {
//     const { firebaseToken } = req.body;
//     if (!firebaseToken)
//       return res.status(400).json({ success: false, message: "Firebase token required" });

//     const decoded = await admin.auth().verifyIdToken(firebaseToken);

//     const user = await User.findOneAndUpdate(
//       { uid: decoded.uid },
//       { lastLoginAt: new Date() },
//       { new: true }
//     );

//     if (!user)
//       return res.status(404).json({ success: false, message: "User not found" });

//     const token = issueJWT(user);
//     setJWTCookie(res, token);
//     return res.json({ success: true, token, user: sanitizeUser(user) });
//   } catch (err) {
//     return res.status(401).json({ success: false, message: err.message });
//   }
// };

// // ── ADMIN: Get all users ──────────────────────────────────────────────────────
// // GET /auth/users
// exports.getAllUsers = async (req, res) => {
//   try {
//     const { role, sellerStatus, page = 1, limit = 20 } = req.query;
//     const filter = {};
//     if (role)         filter.role         = role;
//     if (sellerStatus) filter.sellerStatus = sellerStatus;

//     const users = await User.find(filter)
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(Number(limit))
//       .select("-__v");

//     const total = await User.countDocuments(filter);
//     return res.json({ success: true, total, data: users.map(sanitizeUser) });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // ── ADMIN: Approve / Reject Seller ────────────────────────────────────────────
// // PUT /auth/seller/:uid/status
// exports.updateSellerStatus = async (req, res) => {
//   try {
//     const { uid }             = req.params;
//     const { status, reason }  = req.body;

//     if (!["approved", "rejected"].includes(status))
//       return res.status(400).json({ success: false, message: "Invalid status" });

//     const update = {
//       sellerStatus:         status,
//       isSellerVerified:     status === "approved",
//       sellerRejectedReason: status === "rejected" ? (reason || "") : "",
//     };

//     const user = await User.findOneAndUpdate({ uid }, update, { new: true });
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     return res.json({ success: true, user: sanitizeUser(user), message: `Seller ${status}` });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// // ── Helper: strip internal fields ────────────────────────────────────────────
// function sanitizeUser(user) {
//   const obj = user.toObject ? user.toObject() : { ...user };
//   delete obj.__v;
//   // Never send password hashes etc. if you add them later
//   return obj;
// }

const jwt   = require("jsonwebtoken");
const admin = require("../config/firebaseAdmin");
const User  = require("../models/User");

// ── Issue JWT ─────────────────────────────────────────────────────────────────
function issueJWT(user) {
  return jwt.sign(
    {
      uid:          user.uid,
      email:        user.email,
      firstName:    user.firstName,
      lastName:     user.lastName,
      role:         user.role,
      sellerStatus: user.sellerStatus,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ── Set JWT cookie ────────────────────────────────────────────────────────────
// falrex.com (Vercel) ↔ falrexbackend.railway.app (Railway) are different
// domains, so this is ALWAYS a cross-site cookie in production.
//
// Rules for cross-site cookies:
//   sameSite: "none"   → required for cross-site
//   secure:   true     → required when sameSite=none (browser enforces this)
//
// In local dev (localhost ↔ localhost:5000) sameSite=lax is fine because
// both are on localhost. But since the Authorization header fallback also
// works in dev, we just use "none"+secure everywhere to keep it consistent.
// ─────────────────────────────────────────────────────────────────────────────
function setJWTCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure:   isProd,          // must be true in production (HTTPS)
    sameSite: isProd ? "none" : "lax",
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    path:     "/",
  });
}

function clearJWTCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? "none" : "lax",
    path:     "/",
  });
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const {
      firebaseToken,
      firstName, lastName, email, phone,
      role,
      businessName, businessType, businessCategory,
      country, address, website, description,
      taxId, tradeLicense,
      authProvider,
    } = req.body;

    if (!firebaseToken)
      return res.status(400).json({ success: false, message: "Firebase token required" });

    const decoded = await admin.auth().verifyIdToken(firebaseToken);

    const existing = await User.findOne({ uid: decoded.uid });
    if (existing) {
      const token = issueJWT(existing);
      setJWTCookie(res, token);
      return res.json({ success: true, token, user: sanitizeUser(existing), message: "Already registered" });
    }

    await admin.auth().updateUser(decoded.uid, {
      displayName: `${firstName} ${lastName || ""}`.trim(),
    });

    const userData = {
      uid:             decoded.uid,
      email:           email || decoded.email || "",
      firstName:       firstName || "",
      lastName:        lastName  || "",
      phone:           phone || decoded.phone_number || "",
      role:            role === "seller" ? "seller" : "user",
      authProvider:    authProvider || "email",
      isEmailVerified: decoded.email_verified || false,
      sellerStatus:    role === "seller" ? "pending" : "none",
    };

    if (role === "seller") {
      userData.sellerProfile = {
        businessName:     businessName     || "",
        businessType:     businessType     || "",
        businessCategory: businessCategory || "",
        country:          country          || "",
        address:          address          || "",
        website:          website          || "",
        description:      description      || "",
        taxId:            taxId            || "",
        tradeLicense:     tradeLicense     || "",
      };
    }

    const newUser = await User.create(userData);
    const token   = issueJWT(newUser);
    setJWTCookie(res, token);

    return res.status(201).json({
      success: true, token,
      user:    sanitizeUser(newUser),
      message: role === "seller"
        ? "Seller account created. Pending verification."
        : "Account created successfully.",
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken)
      return res.status(400).json({ success: false, message: "Firebase token required" });

    const decoded = await admin.auth().verifyIdToken(firebaseToken);

    let user = await User.findOneAndUpdate(
      { $or: [{ uid: decoded.uid }, { email: decoded.email || null }] },
      { lastLoginAt: new Date(), uid: decoded.uid },
      { new: true }
    );

    if (!user) {
      const provider = decoded.firebase?.sign_in_provider || "";
      user = await User.create({
        uid:             decoded.uid,
        email:           decoded.email || null,
        firstName:       decoded.name?.split(" ")[0] || "User",
        lastName:        decoded.name?.split(" ").slice(1).join(" ") || "",
        role:            "user",
        authProvider:    provider.includes("google") ? "google"
                       : provider.includes("phone")  ? "phone"
                       : "email",
        isEmailVerified: decoded.email_verified || false,
        sellerStatus:    "none",
        lastLoginAt:     new Date(),
      });
    }

    if (!user.isActive)
      return res.status(403).json({ success: false, message: "Account suspended." });

    const token = issueJWT(user);
    setJWTCookie(res, token);

    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET CURRENT USER ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid }).select("-__v");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  clearJWTCookie(res);
  return res.json({ success: true, message: "Logged out" });
};

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken)
      return res.status(400).json({ success: false, message: "Firebase token required" });

    const decoded = await admin.auth().verifyIdToken(firebaseToken);
    const user    = await User.findOneAndUpdate(
      { uid: decoded.uid },
      { lastLoginAt: new Date() },
      { new: true }
    );

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const token = issueJWT(user);
    setJWTCookie(res, token);
    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Get all users ──────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { role, sellerStatus, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role)         filter.role         = role;
    if (sellerStatus) filter.sellerStatus = sellerStatus;

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("-__v");

    const total = await User.countDocuments(filter);
    return res.json({ success: true, total, data: users.map(sanitizeUser) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Approve / Reject Seller ────────────────────────────────────────────
exports.updateSellerStatus = async (req, res) => {
  try {
    const { uid }            = req.params;
    const { status, reason } = req.body;

    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ success: false, message: "Invalid status" });

    const update = {
      sellerStatus:         status,
      isSellerVerified:     status === "approved",
      sellerRejectedReason: status === "rejected" ? (reason || "") : "",
    };

    const user = await User.findOneAndUpdate({ uid }, update, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({ success: true, user: sanitizeUser(user), message: `Seller ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.__v;
  return obj;
}