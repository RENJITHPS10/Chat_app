import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../utils/api";

// ✅ Persisted messaged users
const persistedMessagedUsers =
  JSON.parse(sessionStorage.getItem("messagedUsers")) || {};

const initialState = {
  selectedChat: null,
  chats: [],
  pendingRequests: [], // NEW: List of chat requests
  onlineUsers: [], // NEW: List of online user IDs
  isLoading: false,
  isError: false,
  message: "",
  unreadCounts: {},
  messagedUsers: persistedMessagedUsers,
};

// ✅ Fetch all chats (1-on-1 and Group)
export const fetchChats = createAsyncThunk(
  "chat/fetchChats",
  async (_, thunkAPI) => {
    try {
      const { data } = await api.get("/chat");
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// ✅ Fetch pending chat requests
export const fetchPendingRequests = createAsyncThunk(
  "chat/fetchPendingRequests",
  async (_, thunkAPI) => {
    try {
      const { data } = await api.get("/chat/requests");
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// ✅ Respond to Chat Request
export const respondToRequest = createAsyncThunk(
  "chat/respondToRequest",
  async ({ chatId, status }, thunkAPI) => {
    try {
      const { data } = await api.put("/chat/respond", { chatId, status });
      return { chatId, status, data };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// ✅ Create Group Chat
export const createGroupChat = createAsyncThunk(
  "chat/createGroupChat",
  async (groupData, thunkAPI) => {
    try {
      const { data } = await api.post("/chat/group", groupData);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// ✅ Leave Group Chat
export const leaveGroup = createAsyncThunk(
  "chat/leaveGroup",
  async ({ chatId, userId }, thunkAPI) => {
    try {
      const { data } = await api.put("/chat/groupremove", { chatId, userId });
      return { chatId, userId, data };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// helper to persist
const saveMessagedUsers = (users) => {
  sessionStorage.setItem("messagedUsers", JSON.stringify(users));
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setSelectedChat: (state, action) => {
      state.selectedChat = action.payload;

      if (action.payload?._id) {
        state.messagedUsers[action.payload._id] = true;
        saveMessagedUsers(state.messagedUsers);
      }
    },

    incrementUnreadForUser: (state, action) => {
      const id = action.payload;
      state.unreadCounts[id] = (state.unreadCounts[id] || 0) + 1;
      state.messagedUsers[id] = true;
      saveMessagedUsers(state.messagedUsers);
    },

    clearUnreadForUser: (state, action) => {
      delete state.unreadCounts[action.payload];
    },

    markUserAsMessaged: (state, action) => {
      state.messagedUsers[action.payload] = true;
      saveMessagedUsers(state.messagedUsers);
    },

    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },

    setLatestMessage: (state, action) => {
      const message = action.payload;
      const chatId = message.chat?._id || message.chat;

      const chatIndex = state.chats.findIndex((c) => c._id === chatId);
      if (chatIndex !== -1) {
        // Update the chat's latest message
        const updatedChat = { ...state.chats[chatIndex], latestMessage: message };
        // Remove it from current position and put at top
        state.chats.splice(chatIndex, 1);
        state.chats.unshift(updatedChat);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chats = action.payload;
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(createGroupChat.fulfilled, (state, action) => {
        state.chats.unshift(action.payload); // Add new group to top
        state.selectedChat = action.payload;
      })
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.pendingRequests = action.payload;
      })
      .addCase(respondToRequest.fulfilled, (state, action) => {
        const { chatId, status, data } = action.payload;
        state.pendingRequests = state.pendingRequests.filter(r => r._id !== chatId);
        if (status === "accepted") {
          state.chats.unshift(data);
          state.selectedChat = data;
        }
      })
      .addCase(leaveGroup.fulfilled, (state, action) => {
        const { chatId, userId } = action.payload;
        // If I was the one who left (or was removed), remove the chat entirely
        // (Assuming the backend might return the updated chat for others or a message for the removed user)
        // In our case, the backend returns the updated chat or deletion message.
        state.chats = state.chats.filter((c) => c._id !== chatId);
        if (state.selectedChat?._id === chatId) {
          state.selectedChat = null;
        }
      })
      // RESET ON LOGOUT, LOGIN, or REGISTER (🆕)
      .addMatcher(
        (action) =>
          action.type.endsWith("/logout/fulfilled") ||
          action.type.endsWith("/login/fulfilled") ||
          action.type.endsWith("/register/fulfilled"),
        (state) => {
          state.selectedChat = null;
          state.chats = [];
          state.pendingRequests = [];
          state.unreadCounts = {};
          state.messagedUsers = {};
          sessionStorage.removeItem("messagedUsers");
        }
      );
  },
});

export const {
  setSelectedChat,
  incrementUnreadForUser,
  clearUnreadForUser,
  markUserAsMessaged,
  setOnlineUsers,
  setLatestMessage,
} = chatSlice.actions;

export default chatSlice.reducer;
