const Message      = require("../models/Message");
const Conversation = require("../models/Conversation");
const jwt          = require("jsonwebtoken");

// Track online users: uid → Set of socketIds
const onlineUsers = new Map();

function getRoomId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

module.exports = function initSocket(io) {

  // ── Auth middleware ───────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.split("Bearer ")[1];

    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded    = jwt.verify(token, process.env.JWT_SECRET);
      socket.user      = decoded;
      socket.uid       = decoded.uid;
      socket.userName  = `${decoded.firstName || ""} ${decoded.lastName || ""}`.trim() || "User";
      socket.userRole  = decoded.role || "user";
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.uid;
    console.log(`✅ Socket connected: ${uid} (${socket.userRole})`);

    // ── Register online ───────────────────────────────────────────────────
    if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
    onlineUsers.get(uid).add(socket.id);

    // Join personal room for targeted events
    socket.join(`user:${uid}`);

    // Broadcast online status
    io.emit("user:online", { uid, online: true });

    // Send current online users to new connection
    const onlineList = Array.from(onlineUsers.keys());
    socket.emit("users:online", onlineList);

    // ── Join chat room ────────────────────────────────────────────────────
    socket.on("room:join", ({ roomId }) => {
      socket.join(roomId);
      socket.emit("room:joined", { roomId });
    });

    socket.on("room:leave", ({ roomId }) => {
      socket.leave(roomId);
    });

    // ── Send message ──────────────────────────────────────────────────────
    socket.on("message:send", async (data) => {
      try {
        const {
          receiverId, content, type = "text", fileUrl = "",
          receiverName = "", senderAvatar = "",
        } = data;

        if (!receiverId || !content?.trim()) return;

        const roomId = getRoomId(uid, receiverId);

        // Save to DB
        const message = await Message.create({
          roomId,
          senderId:     uid,
          senderName:   socket.userName,
          senderRole:   socket.userRole,
          senderAvatar,
          receiverId,
          receiverName,
          type,
          content:  content.trim(),
          fileUrl,
          isRead:   false,
        });

        // Update or create conversation
        await Conversation.findOneAndUpdate(
          { roomId },
          {
            $set: {
              lastMessage: {
                content:   type === "text" ? content.trim() : `[${type}]`,
                senderId:  uid,
                createdAt: new Date(),
                type,
              },
            },
            $inc: { [`unreadCount.${receiverId}`]: 1 },
            $setOnInsert: {
              participants: [
                { uid, name: socket.userName, role: socket.userRole, avatar: senderAvatar },
                { uid: receiverId, name: receiverName, role: "user", avatar: "" },
              ],
            },
          },
          { upsert: true, new: true }
        );

        // Emit to room (both sender and receiver if in room)
        io.to(roomId).emit("message:receive", message);

        // Also emit to receiver's personal room (for notification if not in chat)
        io.to(`user:${receiverId}`).emit("message:notification", {
          roomId,
          message,
          from: { uid, name: socket.userName, role: socket.userRole },
        });

      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────
    socket.on("typing:start", ({ roomId }) => {
      socket.to(roomId).emit("typing:start", {
        uid, name: socket.userName, roomId,
      });
    });

    socket.on("typing:stop", ({ roomId }) => {
      socket.to(roomId).emit("typing:stop", { uid, roomId });
    });

    // ── Mark messages as read ─────────────────────────────────────────────
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

        // Notify sender that messages were read
        io.to(`user:${senderId}`).emit("messages:read", { roomId, readBy: uid });

      } catch (err) {
        console.error("messages:read error:", err);
      }
    });

    // ── Delete message ────────────────────────────────────────────────────
    socket.on("message:delete", async ({ messageId, roomId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.senderId !== uid) return;

        msg.isDeleted = true;
        msg.content   = "This message was deleted";
        await msg.save();

        io.to(roomId).emit("message:deleted", { messageId, roomId });
      } catch (err) {
        console.error("message:delete error:", err);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(uid);
          io.emit("user:online", { uid, online: false });
        }
      }
      console.log(`❌ Socket disconnected: ${uid}`);
    });
  });
};