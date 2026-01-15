import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../utils/api";

// ✅ Persisted messaged users
const persistedMessagedUsers =
  JSON.parse(sessionStorage.getItem("messagedUsers")) || {};

const initialState = {
  selectedChat: null,
  chats: [],
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
      });
  },
});

export const {
  setSelectedChat,
  incrementUnreadForUser,
  clearUnreadForUser,
  markUserAsMessaged,
  setOnlineUsers,
} = chatSlice.actions;

export default chatSlice.reducer;
