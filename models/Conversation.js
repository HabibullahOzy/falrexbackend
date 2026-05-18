const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema(
  {
    uid:    { type: String, required: true },
    name:   { type: String, default: ""    },
    role:   { type: String, default: "user"},
    avatar: { type: String, default: ""    },
    email:  { type: String, default: ""    },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    roomId:       { type: String, required: true, unique: true },
    participants: [ParticipantSchema],

    lastMessage: {
      content:    { type: String, default: "" },
      senderId:   { type: String, default: "" },
      senderName: { type: String, default: "" },
      createdAt:  { type: Date,   default: null },
      type:       { type: String, default: "text" },
    },

    // Per-user unread counts  { "uid": count }
    unreadCount: { type: Map, of: Number, default: {} },

    isActive:  { type: Boolean, default: true  },
    isBlocked: { type: Boolean, default: false },
    blockedBy: { type: String,  default: ""    },
  },
  { timestamps: true }
);

ConversationSchema.index({ "participants.uid": 1 });
ConversationSchema.index({ updatedAt: -1 });

module.exports =
  mongoose.models?.Conversation ||
  mongoose.model("Conversation", ConversationSchema);