const Order   = require("../models/Order");
const Cart    = require("../models/Cart");
const Product = require("../models/Product");

function calcFinalPrice(price, discount) {
  if (!price) return 0;
  if (!discount) return price;
  return Math.round(price * (1 - discount / 100));
}

// ── CREATE ORDER (Buy Now or from Cart) ────────────────────────────────────
// POST /orders
exports.createOrder = async (req, res) => {
  try {
    const userId    = req.user?.uid || null;
    const sessionId = req.headers["x-session-id"] || null;

    const {
      items: directItems, // for "Buy Now" — pass single item directly
      fromCart,           // true = use cart items
      shipping,
      paymentMethod = "COD",
      notes = "",
    } = req.body;

    if (!shipping?.firstName || !shipping?.email || !shipping?.phone || !shipping?.address || !shipping?.city || !shipping?.country) {
      return res.status(400).json({ success: false, message: "Shipping details incomplete" });
    }

    let orderItems = [];

    // ── Option 1: Buy Now (single product) ───────────────────────────────
    if (!fromCart && directItems?.length > 0) {
      for (const item of directItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        orderItems.push({
          productId:    product._id,
          nameEng:      product.nameEng,
          image:        product.images?.[0]?.url || "",
          price:        product.price || 0,
          finalPrice:   calcFinalPrice(product.price, product.discount),
          quantity:     Number(item.quantity) || 1,
          currency:     product.currency || "BDT (৳)",
          supplierName: product.supplierName || "",
          variation:    item.variation || {},
        });
      }
    }

    // ── Option 2: Checkout cart ───────────────────────────────────────────
    if (fromCart) {
      const filter = userId ? { userId } : { sessionId };
      const cart   = await Cart.findOne(filter);

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
      }

      orderItems = cart.items.map((item) => ({
        productId:    item.productId,
        nameEng:      item.nameEng,
        image:        item.image,
        price:        item.price,
        finalPrice:   item.finalPrice,
        quantity:     item.quantity,
        currency:     item.currency,
        supplierName: item.supplierName,
        variation:    item.variation,
      }));
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: "No items to order" });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);

    const order = await Order.create({
      userId,
      sessionId,
      items:   orderItems,
      shipping,
      subtotal,
      total:   subtotal,
      currency: orderItems[0]?.currency || "BDT (৳)",
      paymentMethod,
      notes,
    });

    // Clear cart after successful order from cart
    if (fromCart) {
      const filter = userId ? { userId } : { sessionId };
      await Cart.findOneAndUpdate(filter, { items: [] });
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (err) {
    console.error("createOrder error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET MY ORDERS ──────────────────────────────────────────────────────────
// GET /orders/my
exports.getMyOrders = async (req, res) => {
  try {
    const userId    = req.user?.uid || null;
    const sessionId = req.headers["x-session-id"] || null;

    const filter = userId ? { userId } : { sessionId };
    const orders = await Order.find(filter).sort({ createdAt: -1 });

    return res.json({ success: true, data: orders, total: orders.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET ORDER BY ID ────────────────────────────────────────────────────────
// GET /orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: GET ALL ORDERS ──────────────────────────────────────────────────
// GET /orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);
    return res.json({ success: true, total, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: UPDATE ORDER STATUS ─────────────────────────────────────────────
// PUT /orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const update = {};
    if (status)        update.status        = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    return res.json({ success: true, data: order });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};