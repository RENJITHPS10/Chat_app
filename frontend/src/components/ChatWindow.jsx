import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../utils/api";
import socket from "../socket";
import dayjs from "dayjs";
import {
  markUserAsMessaged,
  respondToRequest,
  setLatestMessage,
} from "../features/chatSlice";
import { getSender, getSenderFull } from "../utils/chatLogics";

import {
  Phone,
  Video,
  Send,
  Play,
  Pause,
  FileText,
  PhoneIncoming,
  X,
  Smile,
  Paperclip,
  Mic,
  PhoneMissed,
  PhoneOff,
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  MessageSquareDot,
} from "lucide-react";
import GroupInfoModal from "./GroupInfoModal";

/* ================= HELPERS ================= */
const BACKEND_BASE_URL =
  import.meta.env.VITE_SOCKET_ENDPOINT || "http://localhost:5000";

const resolveFileUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${BACKEND_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const isImage = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
const isPDF = (url) => /\.pdf$/i.test(url);
const isAudio = (url) => /\.(webm|mp3|wav|ogg)$/i.test(url);

/* ================= VOICE PLAYER ================= */
const VoicePlayer = ({ src }) => {
  const audioRef = useRef(new Audio(src));
  const [playing, setPlaying] = useState(false);

  return (
    <div className="mt-2 flex items-center gap-3 bg-slate-900/60 px-3 py-2 rounded-full w-64">
      <button
        onClick={() => {
          playing ? audioRef.current.pause() : audioRef.current.play();
          setPlaying(!playing);
        }}
        className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-black"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <span className="text-xs text-slate-300">Voice message</span>
    </div>
  );
};

/* ================= CHAT WINDOW ================= */
const ChatWindow = () => {
  const dispatch = useDispatch();
  const { selectedChat, onlineUsers } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  // ... [existing state code] ...
  const isOnline = selectedChat && !selectedChat.isGroupChat && selectedChat.users
    ? onlineUsers.includes(getSenderFull(user, selectedChat.users)?._id)
    : false;

  /* ================= SOCKET ================= */
  // ... [existing useEffect code] ...
  // I need to be careful with the context of lines here.
  // I'll re-read the start of the component to be sure.

  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [isCallConnected, setIsCallConnected] = useState(false); // Track connection status

  const [videoOpen, setVideoOpen] = useState(false);

  /* 🆕 */
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null); // { _id, content }

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const [remoteStream, setRemoteStream] = useState(null);

  /* 🆕 */
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const messagesEndRef = useRef(null);

  /* ================= SOCKET ================= */
  useEffect(() => {
    if (!user?._id) return;

    socket.emit("setup", { _id: user._id });

    socket.on("incoming-call", (data) => {
      setIncomingCall(data); // data: { from, offer, callType }
    });

    socket.on("call-answered", async ({ answer }) => {
      setIsCallConnected(true);
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Process queued ice candidates
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error adding queued ice candidate:", err);
          }
        }
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (!candidate) return;

      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ice candidate:", err);
        }
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    });

    socket.on("call-ended", () => {
      // Logic for sender to record a missed call if recipient never answered
      // We use a functional update or refs if needed, but here we can check if it's our outgoing call
      // and it hasn't connected yet.
      if (outgoingCallRef.current && !isCallConnectedRef.current) {
        sendMissedCallMessage(outgoingCallRef.current.to);
      }
      stopVideo();
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
      socket.off("call-ended");
    };
  }, [user]);

  // Use refs to avoid closure staleness for call state in socket listeners
  const outgoingCallRef = useRef(outgoingCall);
  const isCallConnectedRef = useRef(isCallConnected);
  useEffect(() => { outgoingCallRef.current = outgoingCall; }, [outgoingCall]);
  useEffect(() => { isCallConnectedRef.current = isCallConnected; }, [isCallConnected]);


  const sendMissedCallMessage = async (receiverId) => {
    // Don't send if chat is not valid
    if (!selectedChat) return;

    try {
      const { data } = await api.post("/message", {
        chatId: selectedChat._id,
        content: "Missed Call",
        type: "call",
        callStatus: "missed"
      });
      setMessages((p) => [...p, data]);
      socket.emit("new message", data);
    } catch (error) {
      console.error("Failed to send missed call msg", error);
    }
  };

  const handleChatResponse = (status) => {
    dispatch(respondToRequest({ chatId: selectedChat._id, status }));
  };

  const isPending = selectedChat?.status === "pending";
  const iRequested = selectedChat?.requestedBy === user?._id || selectedChat?.requestedBy?._id === user?._id;

  /* ================= READ RECEIPTS ================= */
  const markMessagesAsRead = async () => {
    if (!selectedChat || !user) return;
    try {
      await api.post("/message/read", { chatId: selectedChat._id });
      socket.emit("mark as read", {
        chatId: selectedChat._id,
        userId: user._id,
        users: selectedChat.users,
      });
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!selectedChat) return;

    (async () => {
      const { data } = await api.get(`/message/${selectedChat._id}`);
      setMessages(data);
      socket.emit("join chat", selectedChat._id);
      markMessagesAsRead(); // Mark existing as read when opening
    })();
  }, [selectedChat]);

  /* ================= LISTEN FOR UPDATES ================= */
  useEffect(() => {
    const handleMessageReceived = (newMessage) => {
      if (!selectedChat) return;
      const chatId = newMessage.chat?._id || newMessage.chat;

      // Update sidebar latest message
      dispatch(setLatestMessage(newMessage));

      if (chatId === selectedChat._id) {
        setMessages((prev) => [...prev, newMessage]);
        markMessagesAsRead(); // Mark incoming as read if chat is open
      }
    };

    const handleMessageUpdated = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMessage._id ? updatedMessage : m))
      );
    };

    const handleMessageRemoved = (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, content: "This message was deleted", isDeleted: true, fileUrl: null } : m
        )
      );
    };

    const handleMessagesSeen = (data) => {
      if (selectedChat && data.chatId === selectedChat._id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.sender._id === user._id && !m.readBy.includes(data.userId)) {
              return { ...m, readBy: [...m.readBy, data.userId] };
            }
            return m;
          })
        );
      }
    };

    socket.on("message received", handleMessageReceived);
    socket.on("message updated", handleMessageUpdated);
    socket.on("message removed", handleMessageRemoved);
    socket.on("messages seen", handleMessagesSeen);

    return () => {
      socket.off("message received", handleMessageReceived);
      socket.off("message updated", handleMessageUpdated);
      socket.off("message removed", handleMessageRemoved);
      socket.off("messages seen", handleMessagesSeen);
    };
  }, [selectedChat, user]);

  /* ================= SEND TEXT ================= */
  const sendText = async () => {
    if (!newMessage.trim()) return;

    if (editingMessage) {
      try {
        const { data } = await api.put("/message/edit", {
          messageId: editingMessage._id,
          content: newMessage,
        });
        setMessages((p) => p.map((m) => (m._id === data._id ? data : m)));
        socket.emit("message edited", data);
        setEditingMessage(null);
        setNewMessage("");
      } catch (error) {
        console.error("Failed to edit message", error);
      }
      return;
    }

    const { data } = await api.post("/message", {
      content: newMessage,
      chatId: selectedChat._id,
      type: "text",
    });

    // Ensure we send the full message object so socket logic has access to msg.chat.users
    socket.emit("new message", data);
    setMessages((p) => [...p, data]);
    dispatch(setLatestMessage(data)); // Update sidebar locally
    dispatch(markUserAsMessaged(selectedChat._id));
    setNewMessage("");
  };

  const deleteMsg = async (messageId) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await api.delete(`/message/${messageId}`);
      setMessages((p) =>
        p.map((m) =>
          m._id === messageId ? { ...m, content: "This message was deleted", isDeleted: true, fileUrl: null } : m
        )
      );
      socket.emit("message deleted", {
        messageId,
        chatId: selectedChat._id,
        users: selectedChat.users,
      });
    } catch (error) {
      console.error("Failed to delete message", error);
    }
  };

  const startEditing = (m) => {
    setEditingMessage(m);
    setNewMessage(m.content);
    // Focus input would be nice but complicates ref if not careful
  };

  /* ================= FILE SEND (🆕) ================= */
  const sendFile = async (file) => {
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    const upload = await api.post("/upload", form);

    const { data } = await api.post("/message", {
      chatId: selectedChat._id,
      fileUrl: upload.data.url,
      type: isImage(upload.data.url) ? "image" : isAudio(upload.data.url) ? "audio" : "file" // Basic inference
    });

    socket.emit("new message", data);
    setMessages((p) => [...p, data]);
    dispatch(setLatestMessage(data)); // Update sidebar locally
    dispatch(markUserAsMessaged(selectedChat._id));
  };

  /* ================= VOICE RECORD (🆕) ================= */
  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    recorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "voice.webm", { type: "audio/webm" });
      sendFile(file);
    };

    recorder.start();
    setRecording(true);
  };

  /* ================= VIDEO ================= */
  const createPeer = (toUserId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && toUserId) {
        socket.emit("ice-candidate", {
          to: toUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        console.error("WebRTC Connection Failed");
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        console.log("Remote track received");
        setRemoteStream(event.streams[0]);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  };

  /* ================= VIDEO ================= */
  // ... (createPeer remains same)

  const startVideo = async (constraints = { video: true, audio: true }) => {
    // Safety: stop any existing tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support camera/microphone access or you are not using a secure (HTTPS) connection.");
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setVideoOpen(true);
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      const msg = err.name === "NotFoundError" || err.name === "DevicesNotFoundError"
        ? "No camera or microphone found."
        : err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Permission to access camera/microphone was denied."
          : err.message || "Could not access media devices.";
      alert(msg + " Please check your settings.");
    }
  };

  const stopVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setVideoOpen(false);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    setIncomingCall(null);
    setOutgoingCall(null);
    setIsCallConnected(false);
    iceCandidatesQueue.current = [];
  };

  const endCurrentCall = () => {
    if (selectedChat && !selectedChat.isGroupChat) {
      const otherUser = getSenderFull(user, selectedChat.users);

      // Emit end-call signal
      socket.emit("end-call", { to: otherUser._id });

      // If I am caller and call never connected, I missed them (or I cancelled).
      // If I hang up before they answer -> Missed Call.
      if (outgoingCall && !isCallConnected) {
        sendMissedCallMessage(otherUser._id);
      }
    }
    stopVideo();
  };

  /* ================= CALL ================= */
  const startCall = async (type) => {
    if (selectedChat.isGroupChat) {
      return alert("Voice/Video calls are only available in 1-on-1 chats.");
    }

    const otherUser = getSenderFull(user, selectedChat.users);

    setIsCallConnected(false); // Reset
    setOutgoingCall({ to: otherUser._id, name: otherUser.name });

    const constraints = type === "video"
      ? { video: true, audio: true }
      : { video: false, audio: true };

    await startVideo(constraints);
    const pc = createPeer(otherUser._id);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("call-user", {
      from: {
        _id: user._id,
        name: user.name,
        email: user.email,
        pic: user.pic,
      },
      to: otherUser._id,
      callType: type,
      offer,
    });
  };

  const acceptCall = async () => {
    // 1. Start local video/audio based on incoming type
    const constraints = incomingCall.callType === "video"
      ? { video: true, audio: true }
      : { video: false, audio: true };

    await startVideo(constraints);

    // 2. Create Peer
    const pc = createPeer(incomingCall.from._id);

    // 3. Set Remote Desc (Offer)
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

    // 4. Create Answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // 5. Emit Answer
    socket.emit("answer-call", {
      to: incomingCall.from._id,
      answer,
    });

    setIsCallConnected(true); // ✅ Connected
    setIncomingCall(null);

    // Process queued ice candidates if any
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding queued ice candidate:", err);
      }
    }
  };

  const rejectCall = () => {
    socket.emit("end-call", { to: incomingCall.from._id });
    setIncomingCall(null);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!selectedChat)
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Select a chat
      </div>
    );

  return (
    <div className="flex flex-col flex-1 h-full relative bg-chat-bg">

      {/* HEADER */}
      <div className="sticky top-0 z-40 glass-header h-20 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={!selectedChat.isGroupChat ? getSenderFull(user, selectedChat.users)?.pic : "https://cdn-icons-png.flaticon.com/512/69/69589.png"}
              className="h-10 w-10 rounded-full object-cover border border-white/20"
            />
            {!selectedChat.isGroupChat && (
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black shadow-lg transition-colors ${isOnline ? "bg-success shadow-success/50" : "bg-white/20"
                }`}></div>
            )}
          </div>

          <div>
            <span className="text-white text-lg font-semibold tracking-wide block">
              {!selectedChat.isGroupChat ? getSender(user, selectedChat.users) : selectedChat.chatName}
            </span>
            <button
              onClick={() => selectedChat.isGroupChat && setShowGroupInfo(true)}
              className={`text-xs font-medium tracking-wider uppercase transition-all ${selectedChat.isGroupChat ? "hover:text-white cursor-pointer" : ""
                } ${isOnline ? "text-brand-soft" : "text-text-muted opacity-70"}`}
            >
              {selectedChat.isGroupChat ? `${selectedChat.users.length} members` : (isOnline ? "Online" : "Offline")}
            </button>
          </div>
        </div>
        <div className="flex gap-3 text-brand-soft">
          <button
            onClick={() => !isPending && startCall("audio")}
            disabled={isPending}
            className={`p-2.5 rounded-full hover:bg-brand/10 hover:text-brand transition-all active:scale-95 ${isPending ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <Phone size={20} />
          </button>
          <button
            onClick={() => !isPending && startCall("video")}
            disabled={isPending}
            className={`p-2.5 rounded-full hover:bg-brand/10 hover:text-brand transition-all active:scale-95 ${isPending ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <Video size={20} />
          </button>
        </div>
      </div>

      {/* PENDING BANNER (🆕) */}
      {isPending && (
        <div className="mx-6 mt-4 p-6 rounded-3xl bg-brand/10 border border-brand/20 backdrop-blur-xl flex flex-col items-center text-center animate-slide-in relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mb-4 border border-brand/30 shadow-lg shadow-brand/20">
            <MessageSquareDot size={32} className="text-brand-soft animate-pulse" />
          </div>

          <h4 className="text-white font-bold text-lg mb-2">
            {iRequested ? "Invitation Sent" : "Chat Invitation"}
          </h4>

          <p className="text-text-muted text-sm max-w-sm mb-6 leading-relaxed">
            {iRequested
              ? `Waiting for ${getSender(user, selectedChat.users)} to accept your request. You can't send messages yet.`
              : `${getSender(user, selectedChat.users)} wants to start a conversation with you.`
            }
          </p>

          {!iRequested && (
            <div className="flex gap-4 w-full max-w-xs">
              <button
                onClick={() => handleChatResponse("rejected")}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-danger/20 text-text-muted hover:text-danger border border-white/10 hover:border-danger/30 transition-all font-semibold active:scale-95"
              >
                Ignore
              </button>
              <button
                onClick={() => handleChatResponse("accepted")}
                className="flex-1 px-6 py-3 rounded-xl bg-brand hover:bg-brand-soft text-white shadow-lg shadow-brand/30 transition-all font-bold active:scale-95"
              >
                Accept
              </button>
            </div>
          )}
        </div>
      )}

      {/* MESSAGES */}
      <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar ${isPending ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
        {messages.map((m, i) => {
          // ... [rest of existing message rendering]
          // I'll trim this to be safer in replace_file_content
          const isMe = m.sender._id === user._id;
          const url = resolveFileUrl(m.fileUrl);

          // Check if previous message was from same sender to group visually
          const isSameSender = i > 0 && messages[i - 1].sender._id === m.sender._id;

          // RENDER CALL MESSAGE
          if (m.type === "call" || m.callStatus === "missed") {
            return (
              <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-slide-in`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border relative
                         ${isMe
                    ? "bg-outgoing-msg border-white/5 text-white"
                    : "bg-incoming-msg border-white/5 text-white"
                  }
                     `}>
                  <div className="p-2 bg-red-500/20 rounded-full text-red-400">
                    <PhoneMissed size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Missed Call</p>
                    <p className="text-[10px] opacity-70 cursor-pointer hover:underline" onClick={() => startCall('audio')}>Tap to call back</p>
                  </div>
                  <div className={`text-[10px] self-end opacity-60 ml-2`}>
                    {dayjs(m.createdAt).format("HH:mm")}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-slide-in`}>
              {!isMe && !isSameSender && m.chat?.isGroupChat && (
                <img src={m.sender.pic} className="w-8 h-8 rounded-full mr-2 mt-1 object-cover border border-white/10" alt={m.sender.name} />
              )}

              <div
                className={`px-4 py-3 rounded-2xl max-w-[75%] shadow-lg backdrop-blur-sm relative group
                  ${isMe
                    ? "bg-outgoing-msg text-white rounded-br-none border border-white/5"
                    : "bg-incoming-msg text-text-main rounded-bl-none border border-white/5"
                  }
                  ${!isMe && isSameSender && m.chat?.isGroupChat ? "ml-10" : ""}
                  `}
              >
                <div className="flex items-center justify-between mb-1">
                  {!isMe && m.chat?.isGroupChat && !isSameSender && (
                    <p className="text-xs text-brand-soft font-bold opacity-90">{m.sender.name}</p>
                  )}
                  {isMe && !m.isDeleted && (
                    <div className="hidden group-hover:flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity ml-auto">
                      <button onClick={() => startEditing(m)} className="p-1 hover:text-brand transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => deleteMsg(m._id)} className="p-1 hover:text-danger transition-colors"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                {m.content && (
                  <p className={`leading-relaxed text-[15px] ${m.isDeleted ? 'italic opacity-60' : ''}`}>
                    {m.content}
                    {m.isEdited && !m.isDeleted && <span className="text-[10px] ml-2 opacity-50">(edited)</span>}
                  </p>
                )}

                {/* Media */}
                {url && isImage(url) && <img src={url} className="mt-2 rounded-xl max-h-72 border border-white/10" />}
                {url && isPDF(url) && (
                  <a href={url} target="_blank" className="flex items-center gap-3 mt-2 bg-black/20 p-3 rounded-lg hover:bg-black/30 transition">
                    <div className="bg-red-500/20 p-2 rounded text-red-500"><FileText size={20} /></div>
                    <span className="text-sm underline decoration-white/30 hover:decoration-white/50">{url.split("/").pop()}</span>
                  </a>
                )}
                {url && isAudio(url) && <VoicePlayer src={url} />}

                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <span className={`text-[10px] font-medium ${isMe ? 'opacity-80' : 'text-text-muted opacity-80'}`}>
                    {dayjs(m.createdAt).format("HH:mm")}
                  </span>
                  {isMe && !m.isDeleted && (
                    <div className="flex items-center">
                      {m.readBy?.length > 0 ? (
                        <CheckCheck size={14} className="text-blue-400" />
                      ) : (
                        <Check size={14} className="opacity-60" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT WITH ICONS (🆕) */}
      <div className={`bg-transparent p-4 ${isPending ? 'opacity-30 pointer-events-none' : ''}`}>
        {editingMessage && (
          <div className="flex items-center justify-between bg-brand/10 border border-brand/20 p-2 rounded-t-2xl mb-[-10px] animate-slide-in relative z-0">
            <div className="flex items-center gap-2 text-brand-soft text-xs font-semibold">
              <Pencil size={12} />
              <span>Editing: {editingMessage.content.substring(0, 50)}...</span>
            </div>
            <button
              onClick={() => {
                setEditingMessage(null);
                setNewMessage("");
              }}
              className="text-text-muted hover:text-white transition-colors p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-2 py-2 shadow-2xl z-10">

          <button
            className="p-2 rounded-full hover:bg-white/10 text-text-muted hover:text-brand transition-colors"
            onClick={() => !isPending && fileInputRef.current.click()}
            disabled={isPending}
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => sendFile(e.target.files[0])}
          />

          <button
            className="p-2 rounded-full hover:bg-white/10 text-text-muted hover:text-yellow-400 transition-colors"
            onClick={() => !isPending && setShowEmoji((p) => !p)}
            disabled={isPending}
          >
            <Smile size={20} />
          </button>

          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isPending && sendText()}
            disabled={isPending}
            className="flex-1 bg-transparent text-white px-2 py-2 text-base focus:outline-none placeholder:text-text-muted/50 font-light"
            placeholder={isPending ? "Chat invitation pending..." : "Type a message..."}
          />

          <button
            onClick={() => !isPending && toggleRecording()}
            disabled={isPending}
            className={`p-2 rounded-full transition-all ${recording ? "bg-red-500/10 text-red-500 animate-pulse" : "hover:bg-white/10 text-text-muted hover:text-red-400"}`}
          >
            <Mic size={20} />
          </button>

          <button
            onClick={() => !isPending && sendText()}
            disabled={isPending}
            className="bg-brand hover:bg-brand-soft text-white p-2.5 rounded-xl shadow-lg shadow-brand/30 hover:shadow-brand/50 transition-all active:scale-95 ml-1 disabled:opacity-50"
          >
            <Send size={18} fill="white" />
          </button>

          {showEmoji && (
            <div className="absolute bottom-full left-0 mb-4 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 grid grid-cols-6 gap-2 z-50 shadow-glass animate-slide-in">
              {["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😉", "😊", "😍", "😘", "😜", "😎", "😭", "😡", "👍", "🙏", "🔥", "❤️"].map(e => (
                <button key={e} onClick={() => { setNewMessage(p => p + e); setShowEmoji(false); }} className="text-2xl hover:bg-white/10 p-1 rounded transition">
                  {e}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* VIDEO MODAL */}
      {videoOpen && (
        <div className="fixed inset-0 bg-black/95 z-[999] flex flex-col md:flex-row backdrop-blur-sm">
          <div className="flex-1 relative border-r border-white/10">
            {/* Local Video - muted to avoid echo */}
            <video
              ref={(ref) => {
                if (ref && localStreamRef.current) {
                  ref.srcObject = localStreamRef.current;
                }
                localVideoRef.current = ref;
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror-mode"
            />
            <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full text-white text-xs font-bold tracking-wide">You</div>
          </div>
          <div className="flex-1 relative bg-app-bg flex items-center justify-center overflow-hidden">
            {/* Abstract BG for audio calls or connecting */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand via-app-bg to-app-bg"></div>

            {remoteStream ? (
              <video
                ref={(ref) => {
                  if (ref) ref.srcObject = remoteStream;
                  remoteVideoRef.current = ref;
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover relative z-10"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 relative z-10 animate-pulse">
                <div className="w-20 h-20 rounded-full bg-brand/20 flex items-center justify-center border-2 border-brand"><Video size={32} className="text-brand" /></div>
                <div className="text-text-muted font-light tracking-widest text-sm uppercase">Connecting Securely...</div>
              </div>
            )}
            <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full text-white text-xs font-bold tracking-wide z-20">Remote</div>
          </div>

          <button onClick={endCurrentCall} className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-danger hover:bg-red-600 px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] transition-all active:scale-95 z-50 flex items-center gap-3">
            <Phone size={24} fill="white" className="text-white" />
            <span className="text-white font-bold tracking-wide uppercase">End Call</span>
          </button>
        </div>
      )}

      {/* INCOMING CALL */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[999]">
          <div className="bg-gray-900 border border-white/10 p-8 rounded-3xl text-center space-y-6 w-96 shadow-glass relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-brand/10 to-transparent pointer-events-none"></div>

            <div className="w-24 h-24 mx-auto bg-brand/20 rounded-full flex items-center justify-center animate-bounce border-2 border-brand shadow-[0_0_30px_rgba(99,102,241,0.3)]">
              <PhoneIncoming className="text-brand" size={40} />
            </div>

            <div>
              <p className="text-text-muted text-sm uppercase tracking-widest mb-2">Incoming Call from</p>
              <p className="text-white text-2xl font-bold">{incomingCall.from.name || "Unknown User"}</p>
              <p className="text-brand-soft text-sm opacity-80">{incomingCall.from.email || ""}</p>
            </div>

            <div className="flex gap-6 justify-center mt-8">
              <button onClick={rejectCall} className="bg-white/5 hover:bg-danger hover:text-white text-danger border border-white/10 p-4 rounded-2xl transition w-full flex items-center justify-center gap-2 group">
                <X size={24} />
                <span className="font-semibold">Decline</span>
              </button>
              <button onClick={acceptCall} className="bg-success text-black hover:bg-emerald-400 p-4 rounded-2xl transition w-full shadow-lg shadow-success/20 hover:shadow-success/40 flex items-center justify-center gap-2">
                <Phone size={24} fill="black" />
                <span className="font-bold">Accept</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupInfo && (
        <GroupInfoModal
          chat={selectedChat}
          onClose={() => setShowGroupInfo(false)}
        />
      )}

    </div>
  );
};

export default ChatWindow;
