const Message      = require("../models/Message");
const Conversation = require("../models/Conversation");
const User         = require("../models/User");

function getRoomId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

// ── GET /chat/conversations ────────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const uid = req.user.uid;

    const conversations = await Conversation.find({
      "participants.uid": uid,
      isActive: true,
    }).sort({ updatedAt: -1 });

    return res.json({ success: true, data: conversations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /chat/messages/:roomId ─────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { roomId }             = req.params;
    const { page = 1, limit = 30 } = req.query;
    const uid                    = req.user.uid;

    // Verify user is participant
    const conv = await Conversation.findOne({ roomId });
    if (conv && !conv.participants.some((p) => p.uid === uid)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const total = await Message.countDocuments({ roomId, isDeleted: false });

    const messages = await Message.find({ roomId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Mark as read
    await Message.updateMany(
      { roomId, receiverId: uid, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Reset unread
    await Conversation.findOneAndUpdate(
      { roomId },
      { $set: { [`unreadCount.${uid}`]: 0 } }
    );

    return res.json({
      success: true,
      data:    messages.reverse(), // oldest first
      total,
      pages:   Math.ceil(total / limit),
      page:    Number(page),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /chat/room — get or create ───────────────────────────────────────
exports.getOrCreateRoom = async (req, res) => {
  try {
    const { targetUid, targetName, targetRole, targetAvatar, targetEmail } =
      req.body;
    const me = req.user;

    if (!targetUid) {
      return res.status(400).json({ success: false, message: "targetUid required" });
    }
    if (targetUid === me.uid) {
      return res.status(400).json({ success: false, message: "Cannot chat with yourself" });
    }

    const roomId = getRoomId(me.uid, targetUid);

    // Fetch target user info from DB if not provided
    let targetInfo = {
      uid:    targetUid,
      name:   targetName  || "User",
      role:   targetRole  || "user",
      avatar: targetAvatar|| "",
      email:  targetEmail || "",
    };

    if (!targetName) {
      const targetUser = await User.findOne({ uid: targetUid }).select(
        "firstName lastName role avatar email"
      );
      if (targetUser) {
        targetInfo = {
          uid:    targetUid,
          name:   `${targetUser.firstName} ${targetUser.lastName || ""}`.trim(),
          role:   targetUser.role,
          avatar: targetUser.avatar || "",
          email:  targetUser.email  || "",
        };
      }
    }

    let conv = await Conversation.findOne({ roomId });
    if (!conv) {
      conv = await Conversation.create({
        roomId,
        participants: [
          {
            uid:    me.uid,
            name:   `${me.firstName} ${me.lastName || ""}`.trim() || me.email,
            role:   me.role,
            avatar: me.avatar || "",
            email:  me.email  || "",
          },
          targetInfo,
        ],
        unreadCount: { [me.uid]: 0, [targetUid]: 0 },
      });
    }

    return res.json({ success: true, data: { roomId, conversation: conv } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /chat/messages/:roomId/read ───────────────────────────────────────
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

// ── DELETE /chat/messages/:messageId ─────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg)
      return res.status(404).json({ success: false, message: "Not found" });

    if (msg.senderId !== req.user.uid) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    msg.isDeleted = true;
    msg.content   = "This message was deleted.";
    await msg.save();

    return res.json({ success: true, data: msg });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /chat/unread ──────────────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user.uid,
      isRead:     false,
      isDeleted:  false,
    });
    return res.json({ success: true, count });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /chat/users — list users to start new chat ────────────────────────
exports.getChatUsers = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const uid             = req.user.uid;

    const filter = {
      uid:      { $ne: uid },
      isActive: true,
      ...(search && {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName:  { $regex: search, $options: "i" } },
          { email:     { $regex: search, $options: "i" } },
        ],
      }),
    };

    const users = await User.find(filter)
      .select("uid firstName lastName email role avatar sellerStatus")
      .limit(20);

    const mapped = users.map((u) => ({
      uid:    u.uid,
      name:   `${u.firstName} ${u.lastName || ""}`.trim(),
      email:  u.email,
      role:   u.role,
      avatar: u.avatar || "",
    }));

    return res.json({ success: true, data: mapped });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /chat/react/:messageId — add/remove emoji reaction ───────────────
exports.reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const uid       = req.user.uid;

    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ success: false, message: "Not found" });

    const existing = msg.reactions.findIndex((r) => r.uid === uid);
    if (existing !== -1) {
      if (msg.reactions[existing].emoji === emoji) {
        // Remove if same emoji
        msg.reactions.splice(existing, 1);
      } else {
        // Change emoji
        msg.reactions[existing].emoji = emoji;
      }
    } else {
      msg.reactions.push({ uid, emoji });
    }

    await msg.save();
    return res.json({ success: true, data: msg });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};