import { createAdapter } from "@socket.io/redis-adapter";
import { spawn } from "child_process";
import { createServer } from "http";
import httpProxy from "http-proxy";
import { createClient } from "redis";
import { Server } from "socket.io";

import type {
    ClientToServerEvents,
    InterServerEvents,
    ServerToClientEvents,
    SocketData
} from "./src/lib/socket-events";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3367", 10);
const nextPort = port + 1; // Next.js runs on a different port internally

// Start Next.js as a child process with --webpack flag
const nextArgs = dev
    ? ["next", "dev", "--webpack", "-p", String(nextPort)]
    : ["next", "start", "-p", String(nextPort)];

console.log(`Starting Next.js with: bun ${nextArgs.join(" ")}`);

const nextProcess = spawn("bun", nextArgs, {
    stdio: "inherit",
    env: { ...process.env }
});

nextProcess.on("error", (err) => {
    console.error("Failed to start Next.js:", err);
    process.exit(1);
});

// Create a proxy to forward requests to Next.js
const proxy = httpProxy.createProxyServer({
    target: `http://${hostname}:${nextPort}`,
    ws: false // We handle WebSocket ourselves with Socket.io
});

proxy.on("error", (err, _req, res) => {
    console.error("Proxy error:", err);
    if (res && "writeHead" in res && typeof res.writeHead === "function") {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("Bad Gateway - Next.js not ready yet");
    }
});

// Wait for Next.js to be ready
const waitForNextJs = async (maxAttempts = 30): Promise<void> => {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(`http://${hostname}:${nextPort}`);
            if (response.ok || response.status === 404) {
                console.log("Next.js is ready!");
                return;
            }
        } catch {
            // Not ready yet
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("Next.js failed to start within timeout");
};

// Main server setup
const setupServer = async () => {
    await waitForNextJs();

    const server = createServer((req, res) => {
        proxy.web(req, res);
    });

    // Handle HTTP upgrades for HMR (not Socket.io)
    server.on("upgrade", (req, socket, head) => {
        // Check if this is a Socket.io connection
        if (req.url?.startsWith("/socket.io")) {
            // Let Socket.io handle it
            return;
        }
        // Proxy HMR websocket connections to Next.js
        proxy.ws(req, socket, head);
    });

    const io = new Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
    >(server, {
        cors: {
            origin: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ["websocket", "polling"]
    });

    // Set up Redis adapter if REDIS_URL is provided
    if (process.env.REDIS_URL) {
        try {
            const pubClient = createClient({ url: process.env.REDIS_URL });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);

            io.adapter(createAdapter(pubClient, subClient));
            console.log("Socket.io Redis adapter connected");
        } catch (error) {
            console.error("Failed to connect Redis adapter:", error);
        }
    }

    // Track online users
    const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socket IDs

    io.on("connection", async (socket) => {
        console.log("Client connected:", socket.id);

        // Authenticate via session cookie or token
        // For now, we'll extract user info from handshake
        const userId = socket.handshake.auth.userId as string;
        const userName = socket.handshake.auth.userName as string;

        if (!userId) {
            socket.emit("error", { message: "Authentication required" });
            socket.disconnect();
            return;
        }

        socket.data.userId = userId;
        socket.data.userName = userName;

        // Track online status
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
            // Broadcast that user came online
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
                    // Broadcast that user went offline
                    io.emit("presence:update", {
                        userId,
                        status: "offline",
                        lastSeenAt: new Date().toISOString()
                    });
                }
            }
        });
    });

    // Make io available globally for API routes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).io = io;

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Next.js running on http://${hostname}:${nextPort}`);
    });

    // Handle process termination
    const cleanup = () => {
        console.log("Shutting down...");
        nextProcess.kill();
        process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
};

setupServer().catch((err) => {
    console.error("Failed to setup server:", err);
    nextProcess.kill();
    process.exit(1);
});
