const express    = require("express");
const router     = express.Router();
const upload     = require("../middleware/categoryUpload");
const { verifyJWT, requireRole } = require("../middleware/verifyJWT");
const {
  getCategoryTree, createCategory, getAllCategories,
  getAdminAllCategories, getCategoryById,
  updateCategory, approveCategory, deleteCategory, getLandingCategories
} = require("../controllers/category.controller");

// ── Public ────────────────────────────────────────────────────────────────
router.get("/tree",       getCategoryTree);
router.get("/",           getAllCategories);
router.get("/:id",        getCategoryById);

// ── Admin: see all statuses ───────────────────────────────────────────────
router.get("/admin/all",
  // verifyJWT, requireRole("admin", "super_admin"),
  getAdminAllCategories
);

// ── Create (admin, super_admin, seller) ───────────────────────────────────
router.post("/",
  // verifyJWT, requireRole("admin", "super_admin", "seller"),
  upload, createCategory
);

router.get("/landing", getLandingCategories);

// ── Update (admin, super_admin, seller own) ───────────────────────────────
router.put("/:id",
  // verifyJWT, requireRole("admin", "super_admin", "seller"),
  upload, updateCategory
);

// ── Approve/Reject (admin only) ───────────────────────────────────────────
router.put("/:id/approve",
  verifyJWT, requireRole("admin", "super_admin"),
  approveCategory
);

// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/:id",
  verifyJWT, requireRole("admin", "super_admin", "seller"),
  deleteCategory
);

module.exports = router;