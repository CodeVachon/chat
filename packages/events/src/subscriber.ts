import Redis from "ioredis";
import type { Server } from "socket.io";

const CHANNEL = "socket:events";

export function subscribeToEvents(io: Server, redisUrl: string) {
    const sub = new Redis(redisUrl);
    sub.subscribe(CHANNEL);
    sub.on("message", (_ch, raw) => {
        const { room, event, data } = JSON.parse(raw);
        io.to(room).emit(event, data);
    });
    return sub;
}
