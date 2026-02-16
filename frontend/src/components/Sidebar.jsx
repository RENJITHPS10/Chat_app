import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchChats,
  setSelectedChat,
  incrementUnreadForUser,
  clearUnreadForUser,
  setOnlineUsers,
  fetchPendingRequests,
  respondToRequest,
  setLatestMessage,
} from "../features/chatSlice";
import socket from "../socket";
import { getSender, getSenderFull } from "../utils/chatLogics";
import GroupChatModal from "./GroupChatModal";
import SearchModal from "./SearchModal";
import ProfileModal from "./ProfileModal";
import { Plus, Search, LogOut, MessageSquareDot, Check, X as XIcon } from "lucide-react";
import { logout } from "../features/authSlice";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const {
    chats,
    pendingRequests,
    unreadCounts,
    selectedChat,
    onlineUsers,
    isLoading,
    isError,
    message,
  } = useSelector((state) => state.chat);

  const handleLogout = () => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
    dispatch(logout());
    navigate("/", { replace: true });
  };

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    if (user) {
      dispatch(fetchChats());
      dispatch(fetchPendingRequests());
    }
  }, [user, dispatch]);

  const handleRespond = (chatId, status) => {
    dispatch(respondToRequest({ chatId, status }));
  };

  /* ================= ONLINE STATUS ================= */
  useEffect(() => {
    const onlineHandler = (users) => {
      dispatch(setOnlineUsers(users));
    };

    socket.on("online-users", onlineHandler);
    return () => socket.off("online-users", onlineHandler);
  }, [dispatch]);

  /* ================= SOCKET UNREAD ================= */
  useEffect(() => {
    const handler = (msg) => {
      const chatId = msg?.chat?._id || msg?.chat;
      if (!chatId) return;

      // Update recent message in sidebar
      dispatch(setLatestMessage(msg));

      if (!selectedChat || selectedChat._id !== chatId) {
        dispatch(incrementUnreadForUser(chatId));
      }
    };

    socket.on("message received", handler);
    return () => socket.off("message received", handler);
  }, [dispatch, selectedChat]);

  const handleChatClick = (chat) => {
    dispatch(setSelectedChat(chat));
    dispatch(clearUnreadForUser(chat._id));
    setSearch("");
  };

  /* ================= FILTER ================= */
  const visibleChats = chats?.filter((chat) => {
    if (!chat) return false;
    const chatUnfilteredName = !chat.isGroupChat
      ? getSender(user, chat.users)
      : chat.chatName;
    return chatUnfilteredName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    /* ✅ GLASS SIDEBAR */
    <div className="h-full w-full md:w-1/3 flex flex-col border-r border-white/10 glass shrink-0">

      {/* ================= PROFILE & GROUP ================= */}
      <div className="h-20 px-6 flex items-center justify-between glass-header shrink-0">
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-3 group transition-all"
        >
          <div className="relative">
            <img
              src={user?.pic || "https://via.placeholder.com/40"}
              className="h-12 w-12 rounded-full object-cover border-2 border-brand/50 group-hover:border-brand transition-all"
              alt={user?.name}
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-black"></div>
          </div>
          <span className="hidden sm:block text-white text-base font-medium tracking-wide group-hover:text-brand-soft transition-colors">
            {user?.name}
          </span>
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-3 rounded-xl bg-white/5 hover:bg-brand/20 text-text-muted hover:text-white transition-all shadow-lg hover:shadow-brand/20 active:scale-95"
            title="Search Users"
          >
            <Search size={22} />
          </button>
          <button
            onClick={() => setShowGroupModal(true)}
            className="p-3 rounded-xl bg-brand hover:bg-brand-soft text-white shadow-lg hover:shadow-brand-glow transition-all active:scale-95"
            title="Create Group"
          >
            <Plus size={22} />
          </button>
          <button
            onClick={handleLogout}
            className="p-3 rounded-xl bg-white/5 hover:bg-danger/20 text-text-muted hover:text-danger transition-all shadow-lg hover:shadow-danger/20 active:scale-95"
            title="Logout"
          >
            <LogOut size={22} />
          </button>
        </div>
      </div>

      {/* ================= SEARCH ================= */}
      <div className="px-6 py-4 shrink-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand transition-colors" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-black/20 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 border border-white/5 focus:border-brand/30 transition-all placeholder:text-text-muted/50"
          />
        </div>
      </div>

      {/* ================= REQUESTS SECTION (🆕) ================= */}
      {pendingRequests?.length > 0 && (
        <div className="px-3 mb-4 transition-all animate-slide-in">
          <div className="flex items-center gap-2 px-3 py-2 text-brand-soft text-[10px] font-bold uppercase tracking-widest opacity-80">
            <MessageSquareDot size={14} />
            <span>Chat Invitations ({pendingRequests.length})</span>
          </div>
          <div className="space-y-1">
            {pendingRequests.map((req) => (
              <div
                key={req._id}
                className="flex items-center justify-between p-3 rounded-xl bg-brand/5 border border-brand/10 hover:border-brand/30 transition-all group"
              >
                <div className="flex items-center gap-3 truncate flex-1">
                  <img src={req.requestedBy?.pic} className="h-9 w-9 rounded-full border border-white/10" alt="" />
                  <div className="truncate text-xs">
                    <p className="text-white font-semibold truncate">{req.requestedBy?.name}</p>
                    <p className="text-text-muted truncate">wants to chat</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleRespond(req._id, "accepted")}
                    className="p-1.5 rounded-lg bg-success/20 text-success hover:bg-success hover:text-black transition-all"
                    title="Accept"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleRespond(req._id, "rejected")}
                    className="p-1.5 rounded-lg bg-danger/20 text-danger hover:bg-danger hover:text-white transition-all"
                    title="Ignore"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="h-[1px] bg-white/5 mt-4 mx-3" />
        </div>
      )}

      {/* ================= CHAT LIST (SCROLLABLE) ================= */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1 pb-4">
        {isLoading && (
          <div className="p-4 text-center text-text-muted text-sm animate-pulse">Loading chats...</div>
        )}

        {isError && (
          <div className="p-4 text-center text-danger text-sm bg-danger/10 rounded-lg mx-3 border border-danger/20">{message}</div>
        )}

        {!isLoading &&
          !isError &&
          visibleChats?.map((chat) => {
            const chatName = !chat.isGroupChat
              ? getSender(user, chat.users)
              : chat.chatName;

            const chatPic = !chat.isGroupChat
              ? getSenderFull(user, chat.users)?.pic
              : "https://cdn-icons-png.flaticon.com/512/69/69589.png";

            const isSelected = selectedChat?._id === chat._id;

            return (
              <button
                key={chat._id}
                onClick={() => handleChatClick(chat)}
                className={`w-full px-4 py-3.5 flex justify-between items-center rounded-xl text-left transition-all duration-200 group relative overflow-hidden
                  ${isSelected
                    ? "bg-brand/10 border-l-4 border-brand shadow-[0_4px_20px_-5px_rgba(99,102,241,0.3)]"
                    : "hover:bg-white/5 border-l-4 border-transparent hover:border-white/10"
                  }`}
              >
                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${isSelected ? 'opacity-100' : ''}`} />

                <div className="flex items-center gap-4 w-4/5 relative z-10">
                  <div className="relative">
                    <img
                      src={chatPic || "https://via.placeholder.com/40"}
                      className={`h-12 w-12 rounded-full object-cover shrink-0 border ${isSelected ? 'border-brand' : 'border-white/10'}`}
                      alt={chatName}
                    />
                    {/* Real online indicator */}
                    {!chat.isGroupChat && (
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black transition-colors ${onlineUsers.includes(getSenderFull(user, chat.users)?._id) ? "bg-success" : "bg-white/20"
                        }`}></div>
                    )}
                  </div>

                  <div className="truncate flex-1">
                    <span className={`text-base font-medium block truncate mb-0.5 ${isSelected ? 'text-white' : 'text-text-main group-hover:text-white'}`}>
                      {chatName}
                    </span>
                    {chat.latestMessage ? (
                      <span className={`text-sm truncate block ${isSelected ? 'text-brand-soft' : 'text-text-muted group-hover:text-text-muted/80'}`}>
                        <span className="font-medium text-xs opacity-70 mr-1">{chat.latestMessage.sender?.name?.split(' ')[0]}:</span>
                        {chat.latestMessage.content.substring(0, 30)}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted italic">No messages yet</span>
                    )}
                  </div>
                </div>

                {unreadCounts[chat._id] > 0 && (
                  <span className="bg-brand text-white text-[10px] font-bold px-2 py-1 rounded-full min-w-[20px] text-center shadow-lg shadow-brand/50 relative z-10 animate-bounce">
                    {unreadCounts[chat._id]}
                  </span>
                )}
              </button>
            );
          })}

        {!isLoading && !isError && visibleChats?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted space-y-3 opacity-60">
            <Search size={40} strokeWidth={1.5} />
            <p className="text-sm">No chats found</p>
          </div>
        )}
      </div>

      {showGroupModal && <GroupChatModal onClose={() => setShowGroupModal(false)} />}
      {showSearchModal && <SearchModal onClose={() => setShowSearchModal(false)} />}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </div>
  );
};

export default Sidebar;
