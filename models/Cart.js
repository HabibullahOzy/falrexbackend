const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  nameEng:     { type: String, required: true },
  image:       { type: String, default: "" },
  price:       { type: Number, required: true },
  currency:    { type: String, default: "BDT (৳)" },
  discount:    { type: Number, default: 0 },
  finalPrice:  { type: Number, required: true }, // price after discount
  quantity:    { type: Number, default: 1, min: 1 },
  moq:         { type: String, default: "1" },
  supplierName:{ type: String, default: "" },
  variation:   {
    color: { type: String, default: "" },
    size:  { type: String, default: "" },
    sku:   { type: String, default: "" },
  },
}, { _id: true });

const CartSchema = new mongoose.Schema({
  // For logged-in users
  userId:    { type: String, default: null },    // Firebase UID
  // For guests (session-based)
  sessionId: { type: String, default: null },
  items:     [CartItemSchema],
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-delete guest carts after 7 days
CartSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.models?.Cart || mongoose.model("Cart", CartSchema);