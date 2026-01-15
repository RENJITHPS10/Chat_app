import Message from "../models/Message.js";
import User from "../models/User.js";
import Chat from "../models/chatModel.js";

export const sendMessage = async (req, res) => {
  const { content, chatId, fileUrl, fileType } = req.body;

  if ((!content || content.trim() === "") && !fileUrl && req.body.type !== "call") {
    return res
      .status(400)
      .json({ message: "Message must have text or a file" });
  }

  if (!chatId) {
    return res.status(400).json({ message: "chatId is required" });
  }

  var newMessage = {
    sender: req.user._id,
    content: content || "",
    chat: chatId,
    type: req.body.type || "text",
    fileUrl: fileUrl || null,
    callStatus: req.body.callStatus || null,
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error("❌ getMessages error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const editMessage = async (req, res) => {
  const { messageId, content } = req.body;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "You can only edit your own messages" });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate("sender", "name pic email")
      .populate("chat");

    res.json(updatedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "You can only delete your own messages" });
    }

    message.content = "This message was deleted";
    message.isDeleted = true;
    message.fileUrl = null; // Remove file reference if deleted
    await message.save();

    res.json({ _id: messageId, isDeleted: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  const { chatId } = req.body;

  try {
    await Message.updateMany(
      { chat: chatId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ message: "Status updated" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
