import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    sendMessage,
    getMessages,
    editMessage,
    deleteMessage,
    markAsRead,
} from "../controllers/messageController.js";

const router = express.Router();

// POST /api/message        -> send a message
// PUT /api/message/edit    -> edit a message
router.route("/").post(protect, sendMessage);
router.route("/edit").put(protect, editMessage);

// DELETE /api/message/:messageId -> delete a message
router.route("/:messageId").delete(protect, deleteMessage);

// GET /api/message/:chatId  -> get all messages in a chat
router.route("/:chatId").get(protect, getMessages);

// POST /api/message/read    -> mark messages as read
router.route("/read").post(protect, markAsRead);

export default router;
