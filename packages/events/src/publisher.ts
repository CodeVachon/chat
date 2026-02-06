import Redis from "ioredis";

const CHANNEL = "socket:events";
let redis: Redis | null = null;

function getRedis(): Redis {
    if (!redis) redis = new Redis(process.env.REDIS_URL!);
    return redis;
}

export function emitToChannel(channelId: string, event: string, data: unknown) {
    getRedis().publish(CHANNEL, JSON.stringify({ room: `channel:${channelId}`, event, data }));
}

export function emitToConversation(conversationId: string, event: string, data: unknown) {
    getRedis().publish(
        CHANNEL,
        JSON.stringify({ room: `conversation:${conversationId}`, event, data })
    );
}

export function emitToUser(userId: string, event: string, data: unknown) {
    getRedis().publish(CHANNEL, JSON.stringify({ room: `user:${userId}`, event, data }));
}
