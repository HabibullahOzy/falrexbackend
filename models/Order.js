const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  productId:    { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  nameEng:      { type: String, required: true },
  image:        { type: String, default: "" },
  price:        { type: Number, required: true },
  finalPrice:   { type: Number, required: true },
  quantity:     { type: Number, required: true },
  currency:     { type: String, default: "BDT (৳)" },
  supplierName: { type: String, default: "" },
  variation:    {
    color: { type: String, default: "" },
    size:  { type: String, default: "" },
    sku:   { type: String, default: "" },
  },
}, { _id: true });

const ShippingSchema = new mongoose.Schema({
  firstName:   { type: String, required: true },
  lastName:    { type: String, default: "" },
  email:       { type: String, required: true },
  phone:       { type: String, required: true },
  address:     { type: String, required: true },
  city:        { type: String, required: true },
  state:       { type: String, default: "" },
  postalCode:  { type: String, default: "" },
  country:     { type: String, required: true },
  notes:       { type: String, default: "" },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderNumber:  { type: String, unique: true },
  userId:       { type: String, default: null },
  sessionId:    { type: String, default: null },
  items:        [OrderItemSchema],
  shipping:     ShippingSchema,
  subtotal:     { type: Number, required: true },
  total:        { type: Number, required: true },
  currency:     { type: String, default: "BDT (৳)" },
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  paymentStatus:{
    type: String,
    enum: ["unpaid", "paid", "refunded"],
    default: "unpaid",
  },
  paymentMethod:{ type: String, default: "COD" },
  notes:        { type: String, default: "" },
}, { timestamps: true });

// Auto-generate order number
// Auto-generate order number — async hook, no next() needed
OrderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(4, "0")}`;
  }
});
module.exports = mongoose.models?.Order || mongoose.model("Order", OrderSchema);