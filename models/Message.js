const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  // ── Room ────────────────────────────────────────────────────────────────
  roomId:     { type: String, required: true, index: true },

  // ── Sender ───────────────────────────────────────────────────────────────
  senderId:   { type: String, required: true },   // Firebase UID
  senderName: { type: String, default: "User" },
  senderRole: { type: String, default: "user" },  // user | seller | admin
  senderAvatar: { type: String, default: "" },

  // ── Receiver ─────────────────────────────────────────────────────────────
  receiverId:   { type: String, required: true },
  receiverName: { type: String, default: "" },

  // ── Content ──────────────────────────────────────────────────────────────
  type:    { type: String, enum: ["text", "image", "file"], default: "text" },
  content: { type: String, required: true },
  fileUrl: { type: String, default: "" },

  // ── Status ───────────────────────────────────────────────────────────────
  isRead:   { type: Boolean, default: false },
  readAt:   { type: Date,    default: null },
  isDeleted:{ type: Boolean, default: false },

}, { timestamps: true });

// Room ID = sorted UIDs joined by "_" for consistency
MessageSchema.statics.getRoomId = function (uid1, uid2) {
  return [uid1, uid2].sort().join("_");
};

module.exports = mongoose.models?.Message ||
  mongoose.model("Message", MessageSchema);