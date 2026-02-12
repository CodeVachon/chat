import type { ClientToServerEvents, ServerToClientEvents } from "@chat/events";
import { io, Socket } from "socket.io-client";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: SocketType | null = null;
let listenersRegistered = false;

export function getSocket(): SocketType {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3367", {
            transports: ["websocket", "polling"],
            withCredentials: true
        });
    }

    if (!listenersRegistered) {
        listenersRegistered = true;

        socket.on("connect", () => {
            console.log("Connected to socket server");
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from socket server");
        });

        // Auth failures from server middleware arrive as connect_error.
        // Disable reconnect to prevent infinite retry loops.
        const s = socket;
        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
            s.io.opts.reconnection = false;
        });

        socket.on("error", (data) => {
            console.error("Socket error:", data.message);
        });
    }

    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
        listenersRegistered = false;
    }
}
