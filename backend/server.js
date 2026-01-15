import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();

/* ================= EXPRESS ================= */
const app = express();
app.use(express.json());

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.LIVE_CLIENT_URL,
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman, mobile apps

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

/* ================= PATH ================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= STATIC ================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES ================= */
app.use("/api/auth", authRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/", (req, res) => {
  res.send("API running...");
});

/* ================= SERVER ================= */
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

/* ================= DATABASE ================= */
connectDB();

/* ================= SOCKET LOGIC ================= */
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("setup", (user) => {
    if (!user?._id) return;
    socket.join(user._id);

    onlineUsers.set(user._id, socket.id);
    io.emit("online-users", Array.from(onlineUsers.keys()));

    socket.emit("connected");
  });

  socket.on("join chat", (roomId) => {
    socket.join(roomId);
  });

  socket.on("new message", (msg) => {
    if (!msg.chat?.users) return;

    msg.chat.users.forEach((user) => {
      if (user._id === msg.sender._id) return;
      socket.to(user._id).emit("message received", msg);
    });
  });

  socket.on("call-user", ({ from, to, offer, callType }) => {
    io.to(to).emit("incoming-call", { from, offer, callType });
  });

  socket.on("answer-call", ({ to, answer }) => {
    io.to(to).emit("call-answered", { answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { candidate });
  });

  socket.on("end-call", ({ to }) => {
    io.to(to).emit("call-ended");
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);

    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("online-users", Array.from(onlineUsers.keys()));
  });
});

/* ================= LISTEN ================= */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
