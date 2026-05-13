const mongoose = require("mongoose");

const VariationSchema = new mongoose.Schema({
  color: String,
  size: String,
  sku: String,
  stock: String,
});

const SpecFieldsSchema = new mongoose.Schema({}, { strict: false }); // flexible

const ProductSchema = new mongoose.Schema(
  {
    // ── Basic Info ──────────────────────────────────
    nameEng: { type: String, required: true },
    nameLocal: String,
    brand: String,
    modelNumber: String,
    sku: String,
    slug: String,

    // ── Category ────────────────────────────────────
    category: String,
    subcategory: String,
    subSubcategory: String,
    hsCode: String,

    // ── Pricing ─────────────────────────────────────
    price: Number,
    currency: { type: String, default: "USD ($)" },
    discount: Number,
    moq: String,
    stock: Number,
    sampleAvailable: String,

    // ── Supplier ─────────────────────────────────────
    supplierName: String,
    countryOfOrigin: String,
    supplierYears: String,
    certifications: String,
    factoryLocation: String,
    productionCapacity: String,

    // ── Shipping ─────────────────────────────────────
    incoterms: String,
    shippingMethod: String,
    leadTime: String,
    portOfLoading: String,
    shippingNotes: String,

    // ── Specifications (nested) ───────────────────────
    specifications: {
      audio: { type: Map, of: String },
      battery: { type: Map, of: String },
      build: { type: Map, of: String },
      connectivity: { type: Map, of: String },
      business: { type: Map, of: String },
      avgRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    // ── Packaging ────────────────────────────────────
    packagingDetails: String,
    sellingUnit: String,
    grossWeight: String,
    cartonSize: String,

    // ── Variations & Tags ────────────────────────────
    variations: [VariationSchema],
    tags: [String],

    // ── Description ──────────────────────────────────
    shortDescription: String,
    description: String,

    // ── Media (Cloudinary URLs) ───────────────────────
    images: [
      {
        url: String,
        public_id: String, // needed for delete
      },
    ],
    video: {
      url: String,
      public_id: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);