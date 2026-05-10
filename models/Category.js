const mongoose = require("mongoose");

const SubSubCategorySchema = new mongoose.Schema({
  name:  { type: String, required: true },
  slug:  { type: String, required: true },
}, { _id: true });

const SubCategorySchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        { type: String, required: true },
  subSubItems: [SubSubCategorySchema],
}, { _id: true });

const CategorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  slug:        { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  image: {
    url:       { type: String, default: "" },
    public_id: { type: String, default: "" },
  },
  subCategories: [SubCategorySchema],
  isActive:    { type: Boolean, default: true },
  order:       { type: Number,  default: 0 },
}, { timestamps: true });

// Auto-generate slug from name
CategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

module.exports = mongoose.models?.Category ||
  mongoose.model("Category", CategorySchema);