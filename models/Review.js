const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  // ── References ─────────────────────────────────────────────────────────
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  userId:     { type: String, default: null },   // Firebase UID (null = guest)
  sessionId:  { type: String, default: null },   // guest session

  // ── Review content ──────────────────────────────────────────────────────
  rating:     { type: Number, required: true, min: 1, max: 5 },
  title:      { type: String, default: "" },
  body:       { type: String, default: "" },
  images:     [{ url: String, public_id: String }],

  // ── Reviewer info ────────────────────────────────────────────────────────
  reviewerName:  { type: String, default: "Anonymous" },
  reviewerEmail: { type: String, default: "" },
  isVerifiedBuyer: { type: Boolean, default: true },

  // ── Moderation ───────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved",  // auto-approve; set "pending" for moderation
  },
  isHelpful:    { type: Number, default: 0 },
  isNotHelpful: { type: Number, default: 0 },
}, { timestamps: true });

// Prevent duplicate review per order+product
ReviewSchema.index({ orderId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.models?.Review || mongoose.model("Review", ReviewSchema);