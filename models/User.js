// const mongoose = require("mongoose");

// const SellerProfileSchema = new mongoose.Schema({
//   businessName:     { type: String, default: "" },
//   businessType:     { type: String, default: "" },
//   businessCategory: { type: String, default: "" },
//   country:          { type: String, default: "" },
//   address:          { type: String, default: "" },
//   website:          { type: String, default: "" },
//   description:      { type: String, default: "" },
//   taxId:            { type: String, default: "" },
//   tradeLicense:     { type: String, default: "" },
// }, { _id: false });

// const UserSchema = new mongoose.Schema({
//   // ── Core ────────────────────────────────────────────────────────────────
//   uid:          { type: String, required: true, unique: true }, // Firebase UID
//   email:        { type: String, required: true, unique: true },
//   firstName:    { type: String, required: true },
//   lastName:     { type: String, default: "" },
//   phone:        { type: String, default: "" },
//   avatar:       { type: String, default: "" },

//   // ── Role & Status ────────────────────────────────────────────────────────
//   role: {
//     type: String,
//     enum: ["user", "seller", "admin"],
//     default: "user",
//   },

//   // ── Seller ───────────────────────────────────────────────────────────────
//   sellerProfile:    { type: SellerProfileSchema, default: null },
//   sellerStatus: {
//     type: String,
//     enum: ["none", "pending", "approved", "rejected"],
//     default: "none",
//   },
//   sellerRejectedReason: { type: String, default: "" },
//   isSellerVerified:     { type: Boolean, default: false },

//   // ── Verification ─────────────────────────────────────────────────────────
//   isEmailVerified: { type: Boolean, default: false },
//   isPhoneVerified: { type: Boolean, default: false },
//   isActive:        { type: Boolean, default: true },

//   // ── Auth ──────────────────────────────────────────────────────────────────
//   authProvider: {
//     type: String,
//     enum: ["email", "google", "phone"],
//     default: "email",
//   },
//   lastLoginAt: { type: Date, default: null },
// }, { timestamps: true });

// module.exports = mongoose.models?.User || mongoose.model("User", UserSchema);


const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  uid:       { type: String, required: true, unique: true }, // Firebase UID
  email:     { type: String, required: true },
  firstName: { type: String, default: "" },
  lastName:  { type: String, default: "" },
  phone:     { type: String, default: "" },
  avatar:    { type: String, default: "" },

  role: {
    type:    String,
    enum:    ["user", "seller", "admin", "super_admin"],
    default: "user",
  },

  status: {
    type:    String,
    enum:    ["active", "pending", "banned"],
    default: "active",
  },

  sellerStatus: {
    type:    String,
    enum:    ["pending", "approved", "rejected", null],
    default: null,
  },

  sellerProfile: {
    businessName: { type: String, default: "" },
    businessType: { type: String, default: "" },
    address:      { type: String, default: "" },
    website:      { type: String, default: "" },
    description:  { type: String, default: "" },
  },

  lastLogin: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.models?.User || mongoose.model("User", UserSchema);