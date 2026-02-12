const { Server } = require("socket.io");
const { supabase, supabaseAdmin } = require("../config/supabase");

const NOTIFICATION_EVENT = "notification:new";
let ioInstance = null;

function getAllowedOrigins() {
  return [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:3000",
  ].filter(Boolean);
}

function parseBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.split(" ")[1] || null;
}

async function getUserRole(userId) {
  if (!supabaseAdmin || !userId) return "customer";

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("user_type")
    .eq("id", userId)
    .maybeSingle();

  return data?.user_type || "customer";
}

async function authenticateSocket(handshake) {
  const authToken =
    handshake?.auth?.token || parseBearerToken(handshake?.headers?.authorization);

  if (!authToken) {
    throw new Error("Missing socket auth token");
  }

  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authToken);

  if (error || !user) {
    throw new Error("Invalid or expired socket token");
  }

  const role = await getUserRole(user.id);
  return { user, role };
}

function initializeSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        const allowedOrigins = getAllowedOrigins();
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const { user, role } = await authenticateSocket(socket.handshake);
      socket.data.user = user;
      socket.data.role = role;
      return next();
    } catch (err) {
      return next(err);
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.data.user?.id;
    const userEmail = socket.data.user?.email;
    const role = socket.data.role;

    console.log(`🔌 Socket connected: ${userEmail || userId} (role: ${role})`);

    // Every user joins their personal room
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Role-based rooms
    if (role === "admin") {
      socket.join("role:admin");
      console.log(`  ↳ ${userEmail || userId} joined role:admin room`);
    }

    if (role === "owner") {
      socket.join("role:owner");
      console.log(`  ↳ ${userEmail || userId} joined role:owner room`);
    }

    // ── Impersonation: allow admins to join an owner's personal room ──
    socket.on("impersonate:start", (ownerId) => {
      if (role !== "admin" || !ownerId) return;

      // Leave any previously impersonated room
      if (socket.data.impersonatingOwnerId) {
        const prevRoom = `user:${socket.data.impersonatingOwnerId}`;
        socket.leave(prevRoom);
        console.log(`  ↳ ${userEmail || userId} left impersonated room ${prevRoom}`);
      }

      const ownerRoom = `user:${ownerId}`;
      socket.join(ownerRoom);
      socket.data.impersonatingOwnerId = ownerId;
      console.log(`  ↳ ${userEmail || userId} impersonating owner ${ownerId}, joined ${ownerRoom}`);
    });

    socket.on("impersonate:stop", () => {
      if (role !== "admin" || !socket.data.impersonatingOwnerId) return;

      const ownerRoom = `user:${socket.data.impersonatingOwnerId}`;
      socket.leave(ownerRoom);
      console.log(`  ↳ ${userEmail || userId} stopped impersonation, left ${ownerRoom}`);
      socket.data.impersonatingOwnerId = null;
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${userEmail || userId} — ${reason}`);
    });

  });

  return ioInstance;
}

function emitNotificationToUser(userId, notification) {
  if (!ioInstance || !userId || !notification) return;
  ioInstance.to(`user:${userId}`).emit(NOTIFICATION_EVENT, notification);
}

function emitNotificationToRole(role, notification) {
  if (!ioInstance || !role || !notification) return;
  ioInstance.to(`role:${role}`).emit(NOTIFICATION_EVENT, notification);
}

module.exports = {
  initializeSocket,
  emitNotificationToUser,
  emitNotificationToRole,
  NOTIFICATION_EVENT,
};
