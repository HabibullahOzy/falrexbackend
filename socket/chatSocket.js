const Message      = require("../models/Message");
const Conversation = require("../models/Conversation");
const jwt          = require("jsonwebtoken");

// uid → Set of socketIds
const onlineUsers  = new Map();
// roomId → Set of uids currently viewing it
const activeRooms  = new Map();

function getRoomId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

function getOnlineList() {
  return Array.from(onlineUsers.keys());
}

module.exports = function initSocket(io) {

  // ── Auth middleware ────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded    = jwt.verify(token, process.env.JWT_SECRET);
      socket.uid       = decoded.uid;
      socket.userRole  = decoded.role || "user";
      socket.userName  =
        `${decoded.firstName || ""} ${decoded.lastName || ""}`.trim() ||
        decoded.email ||
        "User";
      socket.userEmail = decoded.email || "";
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.uid;
    console.log(`✅ Socket: ${uid} (${socket.userRole}) connected`);

    // ── Register online ──────────────────────────────────────────────────
    if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
    onlineUsers.get(uid).add(socket.id);

    // Join personal notification room
    socket.join(`user:${uid}`);

    // Broadcast online
    io.emit("user:status", { uid, online: true });

    // Send current online list to new connection
    socket.emit("users:online", getOnlineList());

    // ── Join chat room ────────────────────────────────────────────────────
    socket.on("room:join", async ({ roomId }) => {
      socket.join(roomId);

      // Track active room
      if (!activeRooms.has(roomId)) activeRooms.set(roomId, new Set());
      activeRooms.get(roomId).add(uid);

      socket.emit("room:joined", { roomId });

      // Auto-mark messages as read when joining
      try {
        await Message.updateMany(
          { roomId, receiverId: uid, isRead: false },
          { isRead: true, readAt: new Date() }
        );
        await Conversation.findOneAndUpdate(
          { roomId },
          { $set: { [`unreadCount.${uid}`]: 0 } }
        );

        // Notify the other user their messages were read
        socket.to(roomId).emit("messages:read", { roomId, readBy: uid });
      } catch {}
    });

    socket.on("room:leave", ({ roomId }) => {
      socket.leave(roomId);
      activeRooms.get(roomId)?.delete(uid);
    });

    // ── Send message ──────────────────────────────────────────────────────
    socket.on("message:send", async (data) => {
      try {
        const {
          receiverId,
          content,
          type      = "text",
          fileUrl   = "",
          fileName  = "",
          replyTo   = null,
        } = data;

        if (!receiverId || !content?.trim()) return;

        const roomId = getRoomId(uid, receiverId);

        // Create message in DB
        const message = await Message.create({
          roomId,
          senderId:     uid,
          senderName:   socket.userName,
          senderRole:   socket.userRole,
          senderAvatar: "",
          receiverId,
          receiverName: "",
          type,
          content:  content.trim(),
          fileUrl,
          fileName,
          replyTo:  replyTo || undefined,
          isRead:   activeRooms.get(roomId)?.has(receiverId) || false,
        });

        // Update / upsert conversation
        const isReceiverInRoom = activeRooms.get(roomId)?.has(receiverId);

        await Conversation.findOneAndUpdate(
          { roomId },
          {
            $set: {
              lastMessage: {
                content:    type === "text" ? content.trim() : `[${type}]`,
                senderId:   uid,
                senderName: socket.userName,
                createdAt:  new Date(),
                type,
              },
              updatedAt: new Date(),
            },
            $inc: {
              [`unreadCount.${receiverId}`]: isReceiverInRoom ? 0 : 1,
            },
          },
          { upsert: true, new: true }
        );

        // Emit to room (both sender & receiver if in room)
        io.to(roomId).emit("message:receive", message);

        // Emit notification to receiver's personal room
        io.to(`user:${receiverId}`).emit("message:notification", {
          roomId,
          message,
          from: {
            uid:    uid,
            name:   socket.userName,
            role:   socket.userRole,
            email:  socket.userEmail,
          },
        });
      } catch (err) {
        socket.emit("error", { message: "Failed to send message" });
        console.error("message:send error:", err);
      }
    });

    // ── Typing ────────────────────────────────────────────────────────────
    socket.on("typing:start", ({ roomId }) => {
      socket.to(roomId).emit("typing:start", {
        uid,
        name:  socket.userName,
        roomId,
      });
    });

    socket.on("typing:stop", ({ roomId }) => {
      socket.to(roomId).emit("typing:stop", { uid, roomId });
    });

    // ── Read receipt ──────────────────────────────────────────────────────
    socket.on("messages:read", async ({ roomId, senderId }) => {
      try {
        await Message.updateMany(
          { roomId, receiverId: uid, isRead: false },
          { isRead: true, readAt: new Date() }
        );
        await Conversation.findOneAndUpdate(
          { roomId },
          { $set: { [`unreadCount.${uid}`]: 0 } }
        );
        io.to(`user:${senderId}`).emit("messages:read", { roomId, readBy: uid });
      } catch {}
    });

    // ── Delete message ────────────────────────────────────────────────────
    socket.on("message:delete", async ({ messageId, roomId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.senderId !== uid) return;

        msg.isDeleted = true;
        msg.content   = "This message was deleted.";
        await msg.save();

        io.to(roomId).emit("message:deleted", { messageId, roomId });
      } catch {}
    });

    // ── React to message ──────────────────────────────────────────────────
    socket.on("message:react", async ({ messageId, roomId, emoji }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;

        const idx = msg.reactions.findIndex((r) => r.uid === uid);
        if (idx !== -1) {
          if (msg.reactions[idx].emoji === emoji) {
            msg.reactions.splice(idx, 1);
          } else {
            msg.reactions[idx].emoji = emoji;
          }
        } else {
          msg.reactions.push({ uid, emoji });
        }

        await msg.save();
        io.to(roomId).emit("message:reacted", {
          messageId,
          reactions: msg.reactions,
        });
      } catch {}
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(uid);
          io.emit("user:status", { uid, online: false });
        }
      }
      // Remove from active rooms
      activeRooms.forEach((users) => users.delete(uid));
      console.log(`❌ Socket: ${uid} disconnected`);
    });
  });
};