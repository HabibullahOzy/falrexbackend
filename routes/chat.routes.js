const express    = require("express");
const router     = express.Router();
const { verifyJWT } = require("../middleware/verifyJWT");
const {
  getConversations, getMessages, getOrCreateRoom,
  markAsRead, deleteMessage, getUnreadCount,
} = require("../controllers/chat.controller");

// router.use(verifyJWT); // all chat routes require auth

router.get( "/conversations",           getConversations);
router.post("/room",                    getOrCreateRoom);
router.get( "/messages/:roomId",        getMessages);
router.put( "/messages/:roomId/read",   markAsRead);
router.delete("/messages/:messageId",   deleteMessage);
router.get( "/unread",                  getUnreadCount);

module.exports = router;