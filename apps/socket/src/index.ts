import { db } from "@chat/db";
import { createAdapter } from "@socket.io/redis-adapter";
import { createServer } from "http";
import { createClient } from "redis";
import { Server } from "socket.io";

import type {
    ClientToServerEvents,
    InterServerEvents,
    ServerToClientEvents,
    SocketData
} from "@chat/events";
import { subscribeToEvents } from "@chat/events/subscriber";

import { gracefulShutdown } from "./shutdown";

const port = parseInt(process.env.SOCKET_PORT || "3369", 10);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3367";

const server = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    server,
    {
        cors: {
            origin: appUrl,
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ["websocket", "polling"]
    }
);

// Set up Redis adapter if REDIS_URL is provided
const redisUrl = process.env.REDIS_URL;
let pubClient: ReturnType<typeof createClient> | null = null;
let subClient: ReturnType<typeof createClient> | null = null;
let redisSubscriber: ReturnType<typeof subscribeToEvents> | null = null;

if (redisUrl) {
    try {
        pubClient = createClient({ url: redisUrl });
        subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));
        console.log("Socket.io Redis adapter connected");

        // Subscribe to Redis pub/sub events from API routes
        redisSubscriber = subscribeToEvents(io, redisUrl);
        console.log("Subscribed to Redis pub/sub events");
    } catch (error) {
        console.error("Failed to connect Redis adapter:", error);
    }
}

// Graceful shutdown handler
async function shutdown() {
    await gracefulShutdown({ redisSubscriber, pubClient, subClient, io, server });
    process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Parse cookies from a cookie header string
function parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        if (name) cookies[name] = decodeURIComponent(rest.join("="));
    });
    return cookies;
}

// Authenticate via session cookie middleware
// Using io.use() ensures auth failures send `connect_error` to the client,
// which prevents Socket.io from auto-reconnecting on auth rejection.
io.use(async (socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie || "";
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies["better-auth.session_token"];

    if (!sessionToken) {
        return next(new Error("Authentication required"));
    }

    const session = await db.query.sessions.findFirst({
        where: (sessions, { eq, and, gt }) =>
            and(eq(sessions.token, sessionToken), gt(sessions.expiresAt, new Date()))
    });

    if (!session) {
        return next(new Error("Invalid or expired session"));
    }

    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, session.userId)
    });

    if (!user) {
        return next(new Error("User not found"));
    }

    socket.data.userId = user.id;
    socket.data.userName = user.name;
    next();
});

// Track online users
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socket IDs

io.on("connection", (socket) => {
    const userId = socket.data.userId!;
    const userName = socket.data.userName!;

    console.log("Client connected:", socket.id, `(user: ${userId})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
        io.emit("presence:update", { userId, status: "online" });
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join user's personal room for DMs
    socket.join(`user:${userId}`);

    // Handle joining channels
    socket.on("join:channel", (channelId) => {
        socket.join(`channel:${channelId}`);
        console.log(`User ${userId} joined channel ${channelId}`);
    });

    socket.on("leave:channel", (channelId) => {
        socket.leave(`channel:${channelId}`);
        console.log(`User ${userId} left channel ${channelId}`);
    });

    socket.on("join:conversation", (conversationId) => {
        socket.join(`conversation:${conversationId}`);
    });

    socket.on("leave:conversation", (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
    });

    // Handle typing indicators
    socket.on("typing:start", (data) => {
        const payload = {
            userId,
            userName,
            ...data
        };

        if (data.channelId) {
            socket.to(`channel:${data.channelId}`).emit("typing:start", payload);
        } else if (data.conversationId) {
            socket.to(`conversation:${data.conversationId}`).emit("typing:start", payload);
        }
    });

    socket.on("typing:stop", (data) => {
        const payload = {
            userId,
            userName,
            ...data
        };

        if (data.channelId) {
            socket.to(`channel:${data.channelId}`).emit("typing:stop", payload);
        } else if (data.conversationId) {
            socket.to(`conversation:${data.conversationId}`).emit("typing:stop", payload);
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        const userSockets = onlineUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
                onlineUsers.delete(userId);
                io.emit("presence:update", {
                    userId,
                    status: "offline",
                    lastSeenAt: new Date().toISOString()
                });
            }
        }
    });
});

server.listen(port, () => {
    console.log(`> Socket.io server ready on http://localhost:${port}`);
});
