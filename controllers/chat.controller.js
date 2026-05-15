const Message      = require("../models/Message");
const Conversation = require("../models/Conversation");

// ── GET conversations for a user ──────────────────────────────────────────
// GET /chat/conversations
exports.getConversations = async (req, res) => {
  try {
    const uid = req.user.uid;

    const conversations = await Conversation.find({
      "participants.uid": uid,
      isActive: true,
    }).sort({ "lastMessage.createdAt": -1 });

    return res.json({ success: true, data: conversations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET messages in a room ────────────────────────────────────────────────
// GET /chat/messages/:roomId
exports.getMessages = async (req, res) => {
  try {
    const { roomId }    = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ roomId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Message.countDocuments({ roomId, isDeleted: false });

    // Mark as read
    await Message.updateMany(
      { roomId, receiverId: req.user.uid, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Reset unread count for this user
    await Conversation.findOneAndUpdate(
      { roomId },
      { $set: { [`unreadCount.${req.user.uid}`]: 0 } }
    );

    return res.json({
      success: true,
      data:    messages.reverse(), // oldest first
      total,
      pages:   Math.ceil(total / limit),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET or create room ID between two users ───────────────────────────────
// POST /chat/room
exports.getOrCreateRoom = async (req, res) => {
  try {
    const { targetUid, targetName, targetRole, targetAvatar } = req.body;
    const me = req.user;

    const roomId = [me.uid, targetUid].sort().join("_");

    let conversation = await Conversation.findOne({ roomId });

    if (!conversation) {
      conversation = await Conversation.create({
        roomId,
        participants: [
          { uid: me.uid,       name: `${me.firstName} ${me.lastName || ""}`.trim(), role: me.role,   avatar: "" },
          { uid: targetUid,   name: targetName,  role: targetRole || "user", avatar: targetAvatar || "" },
        ],
        unreadCount: { [me.uid]: 0, [targetUid]: 0 },
      });
    }

    return res.json({ success: true, data: { roomId, conversation } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Mark all messages in a room as read ───────────────────────────────────
// PUT /chat/messages/:roomId/read
exports.markAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const uid        = req.user.uid;

    await Message.updateMany(
      { roomId, receiverId: uid, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    await Conversation.findOneAndUpdate(
      { roomId },
      { $set: { [`unreadCount.${uid}`]: 0 } }
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete a message ──────────────────────────────────────────────────────
// DELETE /chat/messages/:messageId
exports.deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ success: false, message: "Not found" });

    if (msg.senderId !== req.user.uid) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    msg.isDeleted = true;
    msg.content   = "This message was deleted";
    await msg.save();

    return res.json({ success: true, data: msg });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get unread count ──────────────────────────────────────────────────────
// GET /chat/unread
exports.getUnreadCount = async (req, res) => {
  try {
    const uid   = req.user.uid;
    const count = await Message.countDocuments({
      receiverId: uid,
      isRead:     false,
      isDeleted:  false,
    });
    return res.json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};