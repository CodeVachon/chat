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
if (redisUrl) {
    try {
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));
        console.log("Socket.io Redis adapter connected");

        // Subscribe to Redis pub/sub events from API routes
        subscribeToEvents(io, redisUrl);
        console.log("Subscribed to Redis pub/sub events");
    } catch (error) {
        console.error("Failed to connect Redis adapter:", error);
    }
}

// Parse cookies from a cookie header string
function parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        if (name) cookies[name] = decodeURIComponent(rest.join("="));
    });
    return cookies;
}

// Track online users
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socket IDs

io.on("connection", async (socket) => {
    console.log("Client connected:", socket.id);

    // Authenticate via session cookie
    const cookieHeader = socket.handshake.headers.cookie || "";
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies["better-auth.session_token"];

    if (!sessionToken) {
        socket.emit("error", { message: "Authentication required" });
        socket.disconnect();
        return;
    }

    // Validate session against database
    const session = await db.query.sessions.findFirst({
        where: (sessions, { eq, and, gt }) =>
            and(eq(sessions.token, sessionToken), gt(sessions.expiresAt, new Date()))
    });

    if (!session) {
        socket.emit("error", { message: "Invalid or expired session" });
        socket.disconnect();
        return;
    }

    // Get user info from the validated session
    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, session.userId)
    });

    if (!user) {
        socket.emit("error", { message: "User not found" });
        socket.disconnect();
        return;
    }

    const userId = user.id;
    const userName = user.name;

    socket.data.userId = userId;
    socket.data.userName = userName;

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
