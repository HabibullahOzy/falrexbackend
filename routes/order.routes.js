const express    = require("express");
const router     = express.Router();
const { verifyJWT, requireRole } = require("../middleware/verifyJWT");
const {
  createOrder, getMyOrders, getOrderById,
  getAllOrders, updateOrderStatus,
} = require("../controllers/order.controller");

// Public — guest + logged-in users
router.post("/",     createOrder);
router.get( "/my",   getMyOrders);
router.get( "/:id",  getOrderById);

// Admin only
router.get(  "/",              verifyJWT, requireRole("admin", "super_admin"), getAllOrders);
router.put(  "/:id/status",   verifyJWT, requireRole("admin", "super_admin"), updateOrderStatus);

module.exports = router;