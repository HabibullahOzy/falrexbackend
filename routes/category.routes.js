const express    = require("express");
const router     = express.Router();
const upload     = require("../middleware/categoryUpload");
const { verifyJWT, requireRole } = require("../middleware/verifyJWT");
const {
  createCategory, getAllCategories, getCategoryById,
  getCategoryBySlug, updateCategory, deleteCategory,
  seedCategories,
} = require("../controllers/category.controller");

// ── Public ────────────────────────────────────────────────────────────────
router.get("/",              getAllCategories);
router.get("/slug/:slug",    getCategoryBySlug);
router.get("/:id",           getCategoryById);

// ── Admin only ────────────────────────────────────────────────────────────
router.post("/seed",
  verifyJWT, requireRole("admin"),
  seedCategories
);
router.post("/",
  verifyJWT, requireRole("admin"),
  upload, createCategory
);
router.put("/:id",
  verifyJWT, requireRole("admin"),
  upload, updateCategory
);
router.delete("/:id",
  verifyJWT, requireRole("admin"),
  deleteCategory
);

module.exports = router;