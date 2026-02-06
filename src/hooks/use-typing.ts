"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import type {
    ClientToServerEvents,
    ServerToClientEvents,
    TypingPayload
} from "@/lib/socket-events";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseTypingOptions {
    socket: SocketType | null;
    channelId?: string;
    conversationId?: string;
}

interface TypingUser {
    userId: string;
    userName: string;
}

export function useTyping({ socket, channelId, conversationId }: UseTypingOptions) {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const isTypingRef = useRef(false);
    const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle incoming typing events
    useEffect(() => {
        if (!socket) return;

        const handleTypingStart = (data: TypingPayload) => {
            // Only process if for current channel/conversation
            if (
                (channelId && data.channelId === channelId) ||
                (conversationId && data.conversationId === conversationId)
            ) {
                // Clear existing timeout for this user
                const existingTimeout = typingTimeoutRef.current.get(data.userId);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                }

                // Add user to typing list
                setTypingUsers((prev) => {
                    if (prev.some((u) => u.userId === data.userId)) return prev;
                    return [...prev, { userId: data.userId, userName: data.userName }];
                });

                // Set timeout to remove user after 3 seconds of no typing
                const timeout = setTimeout(() => {
                    setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
                    typingTimeoutRef.current.delete(data.userId);
                }, 3000);

                typingTimeoutRef.current.set(data.userId, timeout);
            }
        };

        const handleTypingStop = (data: TypingPayload) => {
            if (
                (channelId && data.channelId === channelId) ||
                (conversationId && data.conversationId === conversationId)
            ) {
                // Clear timeout
                const existingTimeout = typingTimeoutRef.current.get(data.userId);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                    typingTimeoutRef.current.delete(data.userId);
                }

                // Remove user from typing list
                setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
            }
        };

        socket.on("typing:start", handleTypingStart);
        socket.on("typing:stop", handleTypingStop);

        const timeouts = typingTimeoutRef.current;
        return () => {
            socket.off("typing:start", handleTypingStart);
            socket.off("typing:stop", handleTypingStop);

            // Clear all timeouts
            timeouts.forEach((timeout) => clearTimeout(timeout));
            timeouts.clear();
        };
    }, [socket, channelId, conversationId]);

    // Clear typing users when channel/conversation changes (adjust state during render)
    const [prevChannelId, setPrevChannelId] = useState(channelId);
    const [prevConversationId, setPrevConversationId] = useState(conversationId);
    if (channelId !== prevChannelId || conversationId !== prevConversationId) {
        setPrevChannelId(channelId);
        setPrevConversationId(conversationId);
        setTypingUsers([]);
        // Timeouts are cleared by the socket effect cleanup above
    }

    // Stop typing indicator
    const stopTyping = useCallback(() => {
        if (!socket || (!channelId && !conversationId)) return;

        if (isTypingRef.current) {
            isTypingRef.current = false;
            socket.emit("typing:stop", { channelId, conversationId });
        }

        if (stopTypingTimeoutRef.current) {
            clearTimeout(stopTypingTimeoutRef.current);
            stopTypingTimeoutRef.current = null;
        }
    }, [socket, channelId, conversationId]);

    // Start typing indicator
    const startTyping = useCallback(() => {
        if (!socket || (!channelId && !conversationId)) return;

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socket.emit("typing:start", { channelId, conversationId });
        }

        // Reset stop typing timeout
        if (stopTypingTimeoutRef.current) {
            clearTimeout(stopTypingTimeoutRef.current);
        }

        // Auto-stop after 2 seconds of no typing
        stopTypingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 2000);
    }, [socket, channelId, conversationId, stopTyping]);

    return {
        typingUsers,
        startTyping,
        stopTyping
    };
}
