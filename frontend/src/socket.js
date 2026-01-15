import { io } from "socket.io-client";

const ENDPOINT =
  import.meta.env.VITE_SOCKET_ENDPOINT && !import.meta.env.VITE_SOCKET_ENDPOINT.includes("localhost")
    ? import.meta.env.VITE_SOCKET_ENDPOINT
    : window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : window.location.origin;

const socket = io(ENDPOINT, {
  transports: ["websocket"],
});

export default socket;
