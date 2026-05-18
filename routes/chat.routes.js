const express       = require("express");
const router        = express.Router();
const { verifyJWT } = require("../middleware/verifyJWT");
const {
  getConversations, getMessages, getOrCreateRoom,
  markAsRead, deleteMessage, getUnreadCount,
  getChatUsers, reactToMessage,
} = require("../controllers/chat.controller");

router.use(verifyJWT);

router.get( "/conversations",            getConversations);
router.get( "/users",                    getChatUsers);
router.post("/room",                     getOrCreateRoom);
router.get( "/messages/:roomId",         getMessages);
router.put( "/messages/:roomId/read",    markAsRead);
router.delete("/messages/:messageId",    deleteMessage);
router.put(  "/react/:messageId",        reactToMessage);
router.get(  "/unread",                  getUnreadCount);

module.exports = router;