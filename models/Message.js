const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    // ── Room ──────────────────────────────────────────────────────────────
    roomId: { type: String, required: true, index: true },

    // ── Sender ────────────────────────────────────────────────────────────
    senderId:     { type: String, required: true },
    senderName:   { type: String, default: "User" },
    senderRole:   { type: String, default: "user" },
    senderAvatar: { type: String, default: "" },

    // ── Receiver ──────────────────────────────────────────────────────────
    receiverId:   { type: String, required: true },
    receiverName: { type: String, default: "" },

    // ── Content ───────────────────────────────────────────────────────────
    type:    { type: String, enum: ["text", "image", "file", "system"], default: "text" },
    content: { type: String, required: true },
    fileUrl: { type: String, default: "" },
    fileName:{ type: String, default: "" },

    // ── Status ────────────────────────────────────────────────────────────
    isRead:    { type: Boolean, default: false },
    readAt:    { type: Date,    default: null   },
    isDeleted: { type: Boolean, default: false  },

    // ── Reactions ─────────────────────────────────────────────────────────
    reactions: [
      {
        uid:   String,
        emoji: String,
      },
    ],

    // ── Reply ─────────────────────────────────────────────────────────────
    replyTo: {
      messageId: { type: String, default: "" },
      content:   { type: String, default: "" },
      senderName:{ type: String, default: "" },
    },
  },
  { timestamps: true }
);

MessageSchema.index({ roomId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, isRead: 1 });

// ── Static helper to generate consistent roomId ────────────────────────────
MessageSchema.statics.getRoomId = function (uid1, uid2) {
  return [uid1, uid2].sort().join("_");
};

module.exports =
  mongoose.models?.Message || mongoose.model("Message", MessageSchema);