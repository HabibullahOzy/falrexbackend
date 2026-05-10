const express = require("express");
const router  = express.Router();
const upload  = require("../middleware/upload");
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  deleteImage,
  getProductBycategory,
} = require("../controllers/product.controller");

// CRUD
router.post(  "/",               upload, createProduct);
router.get(   "/",                       getAllProducts);
router.get(   "/:id", getProductById);
// router.get(   "/subsubcategory/:subSubcategory", getProductBySubsubcategory);
router.put(   "/:id",           upload, updateProduct);
router.delete("/:id",                    deleteProduct);

// Delete a single image from a product
router.delete("/:id/image/:public_id",   deleteImage);


// ── Category route — must come AFTER /:id to avoid conflict ──────────────────
router.get(   "/category/:category",          getProductBycategory);

module.exports = router;