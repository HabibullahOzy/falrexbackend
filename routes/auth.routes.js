const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/auth.controller");
const { verifyJWT, requireRole } = require("../middleware/verifyJWT");

// ── Public routes ─────────────────────────────────────────────────────────────
router.post("/register", controller.register);
router.post("/login",    controller.login);
router.post("/logout",   controller.logout);
router.post("/refresh",  controller.refreshToken);

// ── Protected routes (needs JWT) ──────────────────────────────────────────────
router.get("/me",  controller.getMe);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get("/users",
  verifyJWT, requireRole("admin"),
  controller.getAllUsers
);

router.put("/seller/:uid/status",
  verifyJWT, requireRole("admin"),
  controller.updateSellerStatus
);

module.exports = router;