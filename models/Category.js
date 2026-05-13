const mongoose = require("mongoose");

const SubSubCategorySchema = new mongoose.Schema({
  name:     { type: String, required: true },
  slug:     { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { _id: true });

const SubCategorySchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        { type: String, required: true },
  isActive:    { type: Boolean, default: true },
  subSubItems: [SubSubCategorySchema],
}, { _id: true });

const CategorySchema = new mongoose.Schema({
  // ── Core ────────────────────────────────────────────────────────────────
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  image: {
    url:       { type: String, default: "" },
    public_id: { type: String, default: "" },
  },
  subCategories: [SubCategorySchema],
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },

  // ── Approval system ──────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  rejectedReason: { type: String, default: "" },

  // ── Creator info ─────────────────────────────────────────────────────────
  createdBy: {
    uid:   { type: String, default: "" },
    name:  { type: String, default: "" },
    role:  { type: String, default: "" },
    email: { type: String, default: "" },
  },

  // ── Approval info ────────────────────────────────────────────────────────
  approvedBy: {
    uid:  { type: String, default: "" },
    name: { type: String, default: "" },
  },
  approvedAt: { type: Date, default: null },

}, { timestamps: true });

// ── Auto slug ────────────────────────────────────────────────────────────────
CategorySchema.pre("save", function () {
  if (this.isModified("name") && !this.slug) {
    this.slug = makeSlug(this.name);
  }
});
// OrderSchema.pre("save", async function () {
//   if (!this.orderNumber) {
//     const count = await mongoose.model("Order").countDocuments();
//     this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(4, "0")}`;
//   }
// });

function makeSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

module.exports = mongoose.models?.Category ||
  mongoose.model("Category", CategorySchema);