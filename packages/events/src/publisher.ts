import Redis from "ioredis";

const CHANNEL = "socket:events";
let redis: Redis | null = null;

function getRedis(): Redis {
    if (!redis) {
        const url = process.env.REDIS_URL;
        if (!url) {
            throw new Error("REDIS_URL environment variable is required");
        }
        redis = new Redis(url);
        redis.on("error", (err) => {
            console.error("Redis publisher error:", err);
        });
    }
    return redis;
}

function publish(room: string, event: string, data: unknown) {
    getRedis()
        .publish(CHANNEL, JSON.stringify({ room, event, data }))
        .catch((err) => {
            console.error("Redis publish error:", err);
        });
}

export function emitToChannel(channelId: string, event: string, data: unknown) {
    publish(`channel:${channelId}`, event, data);
}

export function emitToConversation(conversationId: string, event: string, data: unknown) {
    publish(`conversation:${conversationId}`, event, data);
}

export function emitToUser(userId: string, event: string, data: unknown) {
    publish(`user:${userId}`, event, data);
}
