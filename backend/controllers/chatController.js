import Chat from "../models/chatModel.js";
import User from "../models/User.js";

// @description     Create or fetch One to One Chat
// @route           POST /api/chat/
// @access          Protected
export const accessChat = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        console.log("UserId param not sent with request");
        return res.sendStatus(400);
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: req.user._id } } },
            { users: { $elemMatch: { $eq: userId } } },
        ],
    })
        .populate("users", "-password")
        .populate("latestMessage");

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "name pic email",
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        var chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.user._id, userId],
            requestedBy: req.user._id,
            status: "pending",
        };

        try {
            const createdChat = await Chat.create(chatData);
            const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                "users",
                "-password"
            );
            res.status(200).json(FullChat);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
};

// @description     Fetch all chats for a user (Only Accepted)
// @route           GET /api/chat/
// @access          Protected
export const fetchChats = async (req, res) => {
    try {
        let results = await Chat.find({
            users: { $elemMatch: { $eq: req.user._id } },
            status: "accepted",
        })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 });

        results = await User.populate(results, {
            path: "latestMessage.sender",
            select: "name pic email",
        });

        res.status(200).send(results);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @description     Get pending chat requests
// @route           GET /api/chat/requests
// @access          Protected
export const getPendingRequests = async (req, res) => {
    try {
        const requests = await Chat.find({
            users: { $elemMatch: { $eq: req.user._id } },
            status: "pending",
            requestedBy: { $ne: req.user._id }, // User is the recipient
        })
            .populate("users", "-password")
            .populate("requestedBy", "-password")
            .sort({ createdAt: -1 });

        res.status(200).json(requests);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @description     Accept or Reject chat request
// @route           PUT /api/chat/respond
// @access          Protected
export const respondToChatRequest = async (req, res) => {
    const { chatId, status } = req.body; // status: 'accepted' or 'rejected'

    if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: "Chat request not found" });
        }

        // Use toString() for comparison if they are objects
        const isRecipient = chat.users.some(u => u.toString() === req.user._id.toString()) && chat.requestedBy.toString() !== req.user._id.toString();

        if (!isRecipient) {
            return res.status(401).json({ message: "Not authorized to respond to this request" });
        }

        if (status === "rejected") {
            await Chat.findByIdAndDelete(chatId);
            return res.json({ message: "Request rejected and chat removed" });
        }

        chat.status = "accepted";
        await chat.save();

        const updatedChat = await Chat.findById(chatId).populate("users", "-password");
        res.json(updatedChat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @description     Create New Group Chat
// ... [rest of file] ...// @route           POST /api/chat/group
// @access          Protected
export const createGroupChat = async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: "Please Fill all the fields" });
    }

    var users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res
            .status(400)
            .send("More than 2 users are required to form a group chat");
    }

    users.push(req.user);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: req.user,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @description     Rename Group
// @route           PUT /api/chat/rename
// @access          Protected
export const renameGroup = async (req, res) => {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            chatName: chatName,
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!updatedChat) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(updatedChat);
    }
};

// @description     Add user to Group
// @route           PUT /api/chat/groupadd
// @access          Protected
export const addToGroup = async (req, res) => {
    const { chatId, userId } = req.body;

    // check if the requester is admin

    const added = await Chat.findByIdAndUpdate(
        chatId,
        {
            $push: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!added) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(added);
    }
};

// @description     Remove user from Group or Leave Group
// @route           PUT /api/chat/groupremove
// @access          Protected
export const removeFromGroup = async (req, res) => {
    const { chatId, userId } = req.body;

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: "Chat Not Found" });
        }

        // 1. Check if the user being removed exists in the group
        const isUserInGroup = chat.users.some(u => u.toString() === userId);
        if (!isUserInGroup) {
            return res.status(400).json({ message: "User is not in this group" });
        }

        // 2. Authorization: 
        // A user can remove themselves (Leave group)
        // Only the Admin can remove others
        const isSelfRemoval = req.user._id.toString() === userId;
        const isAdmin = chat.groupAdmin.toString() === req.user._id.toString();

        if (!isSelfRemoval && !isAdmin) {
            return res.status(403).json({ message: "Only admin can remove others from the group" });
        }

        // 3. Remove the user
        const updatedUsers = chat.users.filter(u => u.toString() !== userId);

        // 4. Handle Group State
        if (updatedUsers.length === 0) {
            // Delete group if last member leaves
            await Chat.findByIdAndDelete(chatId);
            return res.status(200).json({ message: "Group deleted because the last member left", chatId });
        }

        // 5. Admin Reassignment: If admin leaves, set the next person as admin
        let newAdmin = chat.groupAdmin;
        if (chat.groupAdmin.toString() === userId) {
            newAdmin = updatedUsers[0]; // Simple logic: next person becomes admin
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            {
                users: updatedUsers,
                groupAdmin: newAdmin,
            },
            { new: true }
        )
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(updatedChat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
