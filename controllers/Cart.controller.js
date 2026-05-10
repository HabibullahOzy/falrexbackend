const Cart    = require("../models/Cart");
const Product = require("../models/Product");

// ── Helper: get or create cart ─────────────────────────────────────────────
async function getOrCreateCart(userId, sessionId) {
  const filter = userId
    ? { userId }
    : { sessionId };

  let cart = await Cart.findOne(filter);
  if (!cart) {
    cart = await Cart.create({ ...filter, items: [] });
  }
  return cart;
}

// ── Helper: calculate final price ──────────────────────────────────────────
function calcFinalPrice(price, discount) {
  if (!price) return 0;
  if (!discount) return price;
  return Math.round(price * (1 - discount / 100));
}

// ── GET CART ───────────────────────────────────────────────────────────────
// GET /cart
exports.getCart = async (req, res) => {
  try {
    const userId    = req.user?.uid || null;
    const sessionId = req.headers["x-session-id"] || null;

    if (!userId && !sessionId) {
      return res.json({ success: true, data: { items: [], total: 0, itemCount: 0 } });
    }

    const cart = await getOrCreateCart(userId, sessionId);

    const subtotal   = cart.items.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);
    const itemCount  = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return res.json({
      success: true,
      data: { ...cart.toObject(), subtotal, itemCount },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADD TO CART ────────────────────────────────────────────────────────────
// POST /cart/add
exports.addToCart = async (req, res) => {
  try {
    const userId    = req.user?.uid || null;
    const sessionId = req.headers["x-session-id"] || null;
    const { productId, quantity = 1, variation = {} } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId required" });
    }
    if (!userId && !sessionId) {
      return res.status(400).json({ success: false, message: "sessionId header required for guests" });
    }

    // Fetch product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const finalPrice = calcFinalPrice(product.price, product.discount);
    const imageUrl   = product.images?.[0]?.url || "";

    const cart = await getOrCreateCart(userId, sessionId);

    // Check if same product+variation already in cart
    const existingIdx = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variation.color === (variation.color || "") &&
        item.variation.size  === (variation.size  || "")
    );

    if (existingIdx > -1) {
      cart.items[existingIdx].quantity += Number(quantity);
    } else {
      cart.items.push({
        productId,
        nameEng:      product.nameEng,
        image:        imageUrl,
        price:        product.price || 0,
        currency:     product.currency || "BDT (৳)",
        discount:     product.discount || 0,
        finalPrice,
        quantity:     Number(quantity),
        moq:          product.moq || "1",
        supplierName: product.supplierName || "",
        variation: {
          color: variation.color || "",
          size:  variation.size  || "",
          sku:   variation.sku   || "",
        },
      });
    }

    cart.updatedAt = new Date();
    await cart.save();

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal  = cart.items.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);

    return res.json({
      success: true,
      message: "Added to cart",
      data: { ...cart.toObject(), itemCount, subtotal },
    });
  } catch (err) {
    console.error("addToCart error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE QUANTITY ────────────────────────────────────────────────────────
// PUT /cart/item/:itemId
exports.updateQuantity = async (req, res) => {
  try {
    const userId    = req.user?.uid || null;
    const sessionId = req.headers["x-session-id"] || null;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ success: false, message: "quantity must be >= 1" });
    }

    const filter = userId ? { userId } : { sessionId };
    const cart   = await Cart.findOne(filter);
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    item.quantity  = Number(quantity);
    cart.updatedAt = new Date();
    await cart.save();

    const subtotal  = cart.items.reduce((sum, i) => sum + i.finalPrice * i.quantity, 0);
    const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

    return res.json({ success: true, data: { ...cart.toObject(), subtotal, itemCount } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── REMOVE ITEM ────────────────────────────────────────────────────────────
// DELETE /cart/item/:itemId
exports.removeItem = async (req, res) => {
  try {
    const userId    = req.user?.uid || null;
    const sessionId = req.headers["x-session-id"] || null;
    const { itemId } = req.params;

    const filter = userId ? { userId } : { sessionId };
    const cart   = await Cart.findOne(filter);
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();

    const subtotal  = cart.items.reduce((sum, i) => sum + i.finalPrice * i.quantity, 0);
    const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

    return res.json({ success: true, data: { ...cart.toObject(), subtotal, itemCount } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CLEAR CART ─────────────────────────────────────────────────────────────
// DELETE /cart/clear
exports.clearCart = async (req, res) => {
  try {
    const userId    = req.user?.uid || null;
    const sessionId = req.headers["x-session-id"] || null;

    const filter = userId ? { userId } : { sessionId };
    await Cart.findOneAndUpdate(filter, { items: [] });

    return res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── MERGE GUEST CART → USER CART (after login) ─────────────────────────────
// POST /cart/merge
exports.mergeCarts = async (req, res) => {
  try {
    const userId    = req.user?.uid;
    const sessionId = req.headers["x-session-id"] || req.body.sessionId;

    if (!userId || !sessionId) {
      return res.status(400).json({ success: false, message: "userId and sessionId required" });
    }

    const guestCart = await Cart.findOne({ sessionId });
    const userCart  = await getOrCreateCart(userId, null);

    if (guestCart && guestCart.items.length > 0) {
      for (const guestItem of guestCart.items) {
        const existingIdx = userCart.items.findIndex(
          (item) =>
            item.productId.toString() === guestItem.productId.toString() &&
            item.variation.color === guestItem.variation.color &&
            item.variation.size  === guestItem.variation.size
        );

        if (existingIdx > -1) {
          userCart.items[existingIdx].quantity += guestItem.quantity;
        } else {
          userCart.items.push(guestItem);
        }
      }

      await userCart.save();
      await Cart.findOneAndDelete({ sessionId }); // delete guest cart
    }

    const subtotal  = userCart.items.reduce((sum, i) => sum + i.finalPrice * i.quantity, 0);
    const itemCount = userCart.items.reduce((sum, i) => sum + i.quantity, 0);

    return res.json({ success: true, data: { ...userCart.toObject(), subtotal, itemCount } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};