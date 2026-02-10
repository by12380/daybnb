import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ||
  "http://localhost:5000";

let socket = null;

/**
 * Connect to the Socket.IO server with the given Supabase access token.
 * If already connected, disconnects the old connection first.
 */
export function connectSocket(token) {
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("🔌 Socket connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", reason);
  });

  return socket;
}

/**
 * Disconnect the current socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance (may be null).
 */
export function getSocket() {
  return socket;
}
