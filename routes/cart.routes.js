const express    = require("express");
const router     = express.Router();
const { verifyJWT } = require("../middleware/verifyJWT");
const {
  getCart, addToCart, updateQuantity,
  removeItem, clearCart, mergeCarts,
} = require("../controllers/Cart.controller");

// No auth required — works for guests via sessionId header
router.get(   "/",              getCart);
router.post(  "/add",           addToCart);
router.put(   "/item/:itemId",  updateQuantity);
router.delete("/item/:itemId",  removeItem);
router.delete("/clear",         clearCart);

// Merge requires login
router.post("/merge", verifyJWT, mergeCarts);

module.exports = router;