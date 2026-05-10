const express    = require("express");
const router     = express.Router();
const { verifyJWT, requireRole } = require("../middleware/verifyJWT");
const {
  getAllUsers, getUserByUid,
  updateUserStatus, updateSellerStatus, deleteUser,
} = require("../controllers/user.controller");

// ── Admin only ────────────────────────────────────────────────────────────
router.get("/",
  verifyJWT, requireRole("admin"),
  getAllUsers
);
router.get("/:uid",
  verifyJWT, requireRole("admin"),
  getUserByUid
);
router.put("/:uid/status",
  verifyJWT, requireRole("admin"),
  updateUserStatus
);
router.put("/:uid/seller-status",
  verifyJWT, requireRole("admin"),
  updateSellerStatus
);
router.delete("/:uid",
  verifyJWT, requireRole("admin"),
  deleteUser
);

module.exports = router;