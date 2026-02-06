"use client";

import type { ClientToServerEvents, PresencePayload, ServerToClientEvents } from "@chat/events";
import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UsePresenceOptions {
    socket: SocketType | null;
}

type UserStatus = "online" | "away" | "dnd" | "offline";

interface UserPresence {
    userId: string;
    status: UserStatus;
    lastSeenAt?: string;
}

export function usePresence({ socket }: UsePresenceOptions) {
    const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map());

    useEffect(() => {
        if (!socket) return;

        const handlePresenceUpdate = (data: PresencePayload) => {
            setPresenceMap((prev) => {
                const next = new Map(prev);
                next.set(data.userId, {
                    userId: data.userId,
                    status: data.status,
                    lastSeenAt: data.lastSeenAt
                });
                return next;
            });
        };

        socket.on("presence:update", handlePresenceUpdate);

        return () => {
            socket.off("presence:update", handlePresenceUpdate);
        };
    }, [socket]);

    const getPresence = useCallback(
        (userId: string): UserPresence => {
            return presenceMap.get(userId) || { userId, status: "offline" };
        },
        [presenceMap]
    );

    const isOnline = useCallback(
        (userId: string): boolean => {
            const presence = presenceMap.get(userId);
            return (
                presence?.status === "online" ||
                presence?.status === "away" ||
                presence?.status === "dnd"
            );
        },
        [presenceMap]
    );

    return {
        presenceMap,
        getPresence,
        isOnline
    };
}
