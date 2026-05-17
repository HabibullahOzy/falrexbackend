const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  deleteImage,
  getProductBycategory,
  getProductBySubsubcategory,
  getProductsByFilter,
  getCategoryBySlug,
  deleteProductImage,
  deleteProductVideo,
  searchProducts, getTrendingProducts,
} = require("../controllers/product.controller");

// CRUD
router.post("/", upload, createProduct);
router.get("/", getAllProducts);
// Add BEFORE /:id route
router.get("/filter", getProductsByFilter);
router.get("/category/:slug", getCategoryBySlug);
router.get("/:id", getProductById);
// router.put(   "/:id",           upload, updateProduct);
router.delete("/:id", deleteProduct);

// Delete a single image from a product
// router.delete("/:id/image/:public_id",   deleteImage);


router.put("/:id", upload, updateProduct);
// router.delete("/:id",                          deleteProduct);
router.delete("/:id/image/:public_id", deleteProductImage);
router.delete("/:id/video", deleteProductVideo);


// ── Category route — must come AFTER /:id to avoid conflict ──────────────────
router.get("/category/:category", getProductBycategory);


router.get("/subsubcategory/:subSubcategory", getProductBySubsubcategory);

// GET /category/:name  — fetch one category by name (case-insensitive)
router.get("/:name", async (req, res) => {
  try {
    const category = await Category.findOne({
      name: { $regex: new RegExp(`^${req.params.name}$`, "i") }
    }).lean();

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});



// Add BEFORE /:id
router.get("/search",   searchProducts);
router.get("/trending", getTrendingProducts);

module.exports = router;