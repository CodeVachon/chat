import { io, Socket } from "socket.io-client";

import type { ClientToServerEvents, ServerToClientEvents } from "./socket-events";

interface IoServer {
    to(room: string): { emit(event: string, data: unknown): void };
}

function getIoServer(): IoServer | undefined {
    return (globalThis as Record<string, unknown>).io as IoServer | undefined;
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(
    userId: string,
    userName: string
): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3367", {
            auth: {
                userId,
                userName
            },
            transports: ["websocket", "polling"],
            withCredentials: true
        });

        socket.on("connect", () => {
            console.log("Connected to socket server");
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from socket server");
        });

        socket.on("error", (data) => {
            console.error("Socket error:", data.message);
        });
    }

    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function emitToChannel(channelId: string, event: keyof ServerToClientEvents, data: unknown) {
    const ioServer = getIoServer();
    if (ioServer) {
        ioServer.to(`channel:${channelId}`).emit(event, data);
    }
}

export function emitToConversation(
    conversationId: string,
    event: keyof ServerToClientEvents,
    data: unknown
) {
    const ioServer = getIoServer();
    if (ioServer) {
        ioServer.to(`conversation:${conversationId}`).emit(event, data);
    }
}

export function emitToUser(userId: string, event: keyof ServerToClientEvents, data: unknown) {
    const ioServer = getIoServer();
    if (ioServer) {
        ioServer.to(`user:${userId}`).emit(event, data);
    }
}
