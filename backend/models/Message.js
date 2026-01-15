import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, trim: true, default: "" },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional for group chats where 'chat' field is used
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    type: {
      type: String,
      default: "text", // "text", "image", "file", "audio", "call"
    },
    fileUrl: { type: String, default: null },
    callStatus: { type: String, default: null }, // "missed", "ended" for calls
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
