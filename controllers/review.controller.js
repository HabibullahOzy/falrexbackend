const Review  = require("../models/Review");
const Order   = require("../models/Order");
const Product = require("../models/Product");

// ── CREATE REVIEW ──────────────────────────────────────────────────────────
// POST /reviews
exports.createReview = async (req, res) => {
  try {
    const userId    = req.user?.uid || null;
    const sessionId = req.headers["x-session-id"] || null;

    const {
      orderId, productId, rating,
      title, body, reviewerName, reviewerEmail,
    } = req.body;

    if (!orderId || !productId || !rating) {
      return res.status(400).json({
        success: false,
        message: "orderId, productId, and rating are required",
      });
    }

    // Verify the order exists and belongs to this user/session
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Verify product was in the order
    const productInOrder = order.items.some(
      (item) => item.productId.toString() === productId
    );
    if (!productInOrder) {
      return res.status(400).json({
        success: false,
        message: "Product was not part of this order",
      });
    }

    // Check for duplicate
    const existing = await Review.findOne({ orderId, productId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You already reviewed this product for this order",
      });
    }

    const review = await Review.create({
      orderId,
      productId,
      userId,
      sessionId,
      rating:          Number(rating),
      title:           title           || "",
      body:            body            || "",
      reviewerName:    reviewerName    || "Anonymous",
      reviewerEmail:   reviewerEmail   || "",
      isVerifiedBuyer: true,
    });

    // Update product average rating
    await updateProductRating(productId);

    return res.status(201).json({ success: true, data: review });
  } catch (err) {
    // Duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Already reviewed this product",
      });
    }
    console.error("createReview error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET REVIEWS FOR A PRODUCT ──────────────────────────────────────────────
// GET /reviews/product/:productId
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = "newest" } = req.query;

    const sortMap = {
      newest:  { createdAt: -1 },
      oldest:  { createdAt:  1 },
      highest: { rating: -1 },
      lowest:  { rating:  1 },
      helpful: { isHelpful: -1 },
    };

    const reviews = await Review.find({
      productId,
      status: "approved",
    })
      .sort(sortMap[sort] || sortMap.newest)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Review.countDocuments({ productId, status: "approved" });

    // Rating distribution
    const distribution = await Review.aggregate([
      { $match: { productId: require("mongoose").Types.ObjectId.createFromHexString(productId), status: "approved" } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]);

    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => { dist[d._id] = d.count; });

    const avgRating = total > 0
      ? Object.entries(dist).reduce((sum, [r, c]) => sum + Number(r) * c, 0) / total
      : 0;

    return res.json({
      success: true,
      total,
      avgRating: Math.round(avgRating * 10) / 10,
      distribution: dist,
      data: reviews,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── CHECK IF ALREADY REVIEWED ──────────────────────────────────────────────
// GET /reviews/check?orderId=&productId=
exports.checkReviewed = async (req, res) => {
  try {
    const { orderId, productId } = req.query;
    const existing = await Review.findOne({ orderId, productId });
    return res.json({ success: true, reviewed: !!existing, data: existing });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── MARK HELPFUL ──────────────────────────────────────────────────────────
// PUT /reviews/:id/helpful
exports.markHelpful = async (req, res) => {
  try {
    const { helpful } = req.body; // true or false
    const update = helpful
      ? { $inc: { isHelpful: 1 } }
      : { $inc: { isNotHelpful: 1 } };

    const review = await Review.findByIdAndUpdate(req.params.id, update, { new: true });
    return res.json({ success: true, data: review });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Get all reviews ─────────────────────────────────────────────────
// GET /reviews
exports.getAllReviews = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("productId", "nameEng images");

    const total = await Review.countDocuments(filter);
    return res.json({ success: true, total, data: reviews });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: Update review status ────────────────────────────────────────────
// PUT /reviews/:id/status
exports.updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    return res.json({ success: true, data: review });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Helper: recalculate product average rating ─────────────────────────────
async function updateProductRating(productId) {
  try {
    const result = await Review.aggregate([
      { $match: {
          productId: require("mongoose").Types.ObjectId.createFromHexString(productId),
          status: "approved",
      }},
      { $group: {
          _id: "$productId",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
      }},
    ]);

    if (result.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        avgRating:    Math.round(result[0].avgRating * 10) / 10,
        totalReviews: result[0].totalReviews,
      });
    }
  } catch (err) {
    console.error("updateProductRating error:", err);
  }
}