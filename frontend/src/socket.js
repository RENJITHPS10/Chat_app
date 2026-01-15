import { io } from "socket.io-client";

const ENDPOINT = import.meta.env.VITE_SOCKET_ENDPOINT || "http://localhost:5000";

const socket = io(ENDPOINT, {
  transports: ["websocket"],
});

export default socket;
