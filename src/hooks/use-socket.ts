"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Socket } from "socket.io-client";

import { disconnectSocket, getSocket } from "@/lib/socket";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/socket-events";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
    userId: string;
    userName: string;
}

export function useSocket({ userId, userName }: UseSocketOptions) {
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // getSocket is a singleton factory — safe to call in useMemo
    const socket = useMemo<SocketType | null>(() => {
        if (!userId || !userName) return null;
        return getSocket(userId, userName);
    }, [userId, userName]);

    // Subscribe to connection state via useSyncExternalStore
    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            if (!socket) return () => {};
            socket.on("connect", onStoreChange);
            socket.on("disconnect", onStoreChange);
            return () => {
                socket.off("connect", onStoreChange);
                socket.off("disconnect", onStoreChange);
            };
        },
        [socket]
    );

    const isConnected = useSyncExternalStore(
        subscribe,
        () => socket?.connected ?? false,
        () => false
    );

    // Subscribe to error events
    useEffect(() => {
        if (!socket) return;

        const handleError = (data: { message: string }) => {
            setConnectionError(data.message);
        };

        const handleConnect = () => {
            setConnectionError(null);
        };

        socket.on("error", handleError);
        socket.on("connect", handleConnect);

        return () => {
            socket.off("error", handleError);
            socket.off("connect", handleConnect);
        };
    }, [socket]);

    const joinChannel = useCallback(
        (channelId: string) => {
            socket?.emit("join:channel", channelId);
        },
        [socket]
    );

    const leaveChannel = useCallback(
        (channelId: string) => {
            socket?.emit("leave:channel", channelId);
        },
        [socket]
    );

    const joinConversation = useCallback(
        (conversationId: string) => {
            socket?.emit("join:conversation", conversationId);
        },
        [socket]
    );

    const leaveConversation = useCallback(
        (conversationId: string) => {
            socket?.emit("leave:conversation", conversationId);
        },
        [socket]
    );

    const disconnect = useCallback(() => {
        disconnectSocket();
    }, []);

    return {
        socket,
        isConnected,
        connectionError,
        joinChannel,
        leaveChannel,
        joinConversation,
        leaveConversation,
        disconnect
    };
}
