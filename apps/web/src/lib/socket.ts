import type { ClientToServerEvents, ServerToClientEvents } from "@chat/events";
import { io, Socket } from "socket.io-client";

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
