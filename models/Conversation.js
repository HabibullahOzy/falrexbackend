const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  roomId:      { type: String, required: true, unique: true },

  // Participants
  participants: [{
    uid:    { type: String, required: true },
    name:   { type: String, default: "" },
    role:   { type: String, default: "user" },
    avatar: { type: String, default: "" },
  }],

  // Last message preview
  lastMessage: {
    content:   { type: String, default: "" },
    senderId:  { type: String, default: "" },
    createdAt: { type: Date,   default: null },
    type:      { type: String, default: "text" },
  },

  // Unread counts per user
  unreadCount: { type: Map, of: Number, default: {} },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models?.Conversation ||
  mongoose.model("Conversation", ConversationSchema);