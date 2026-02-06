"use client";

import type {
    ClientToServerEvents,
    MessagePayload,
    ReactionPayload,
    ServerToClientEvents
} from "@chat/events";
import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseMessagesOptions {
    socket: SocketType | null;
    channelId?: string;
    conversationId?: string;
}

interface MessagesState {
    messages: MessagePayload[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    nextCursor: string | null;
}

export function useMessages({ socket, channelId, conversationId }: UseMessagesOptions) {
    const [state, setState] = useState<MessagesState>({
        messages: [],
        isLoading: true,
        error: null,
        hasMore: true,
        nextCursor: null
    });

    // Fetch initial messages
    const fetchMessages = useCallback(
        async (cursor?: string) => {
            if (!channelId && !conversationId) return;

            setState((prev) => ({ ...prev, isLoading: true, error: null }));

            try {
                const endpoint = channelId
                    ? `/api/channels/${channelId}/messages`
                    : `/api/dm/${conversationId}/messages`;

                const url = new URL(endpoint, window.location.origin);
                if (cursor) url.searchParams.set("cursor", cursor);

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error("Failed to fetch messages");
                }

                const data = await response.json();

                setState((prev) => ({
                    ...prev,
                    messages: cursor ? [...data.messages, ...prev.messages] : data.messages,
                    isLoading: false,
                    hasMore: !!data.nextCursor,
                    nextCursor: data.nextCursor
                }));
            } catch (err) {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: err instanceof Error ? err.message : "Something went wrong"
                }));
            }
        },
        [channelId, conversationId]
    );

    // Load more (older) messages
    const loadMore = useCallback(() => {
        if (state.hasMore && state.nextCursor && !state.isLoading) {
            fetchMessages(state.nextCursor);
        }
    }, [fetchMessages, state.hasMore, state.nextCursor, state.isLoading]);

    // Handle new messages from socket
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message: MessagePayload) => {
            // Only add if message belongs to current channel/conversation
            if (
                (channelId && message.channelId === channelId) ||
                (conversationId && message.conversationId === conversationId)
            ) {
                setState((prev) => {
                    // Avoid duplicates (in case we already added it optimistically)
                    if (prev.messages.some((m) => m.id === message.id)) {
                        return prev;
                    }
                    return {
                        ...prev,
                        messages: [...prev.messages, message]
                    };
                });
            }
        };

        const handleUpdateMessage = (message: MessagePayload) => {
            setState((prev) => ({
                ...prev,
                messages: prev.messages.map((m) => (m.id === message.id ? message : m))
            }));
        };

        const handleDeleteMessage = (data: { messageId: string }) => {
            setState((prev) => ({
                ...prev,
                messages: prev.messages.filter((m) => m.id !== data.messageId)
            }));
        };

        const handleAddReaction = (data: ReactionPayload) => {
            setState((prev) => ({
                ...prev,
                messages: prev.messages.map((m) => {
                    if (m.id !== data.messageId) return m;

                    const reactions = m.reactions || [];
                    const existing = reactions.find((r) => r.emoji === data.emoji);

                    if (existing) {
                        return {
                            ...m,
                            reactions: reactions.map((r) =>
                                r.emoji === data.emoji
                                    ? {
                                          ...r,
                                          count: r.count + 1,
                                          users: [
                                              ...r.users,
                                              { id: data.userId, name: data.userName }
                                          ]
                                      }
                                    : r
                            )
                        };
                    }

                    return {
                        ...m,
                        reactions: [
                            ...reactions,
                            {
                                emoji: data.emoji,
                                count: 1,
                                users: [{ id: data.userId, name: data.userName }]
                            }
                        ]
                    };
                })
            }));
        };

        const handleRemoveReaction = (data: ReactionPayload) => {
            setState((prev) => ({
                ...prev,
                messages: prev.messages.map((m) => {
                    if (m.id !== data.messageId) return m;

                    const reactions = m.reactions || [];
                    return {
                        ...m,
                        reactions: reactions
                            .map((r) => {
                                if (r.emoji !== data.emoji) return r;
                                return {
                                    ...r,
                                    count: r.count - 1,
                                    users: r.users.filter((u) => u.id !== data.userId)
                                };
                            })
                            .filter((r) => r.count > 0)
                    };
                })
            }));
        };

        socket.on("message:new", handleNewMessage);
        socket.on("message:update", handleUpdateMessage);
        socket.on("message:delete", handleDeleteMessage);
        socket.on("reaction:add", handleAddReaction);
        socket.on("reaction:remove", handleRemoveReaction);

        return () => {
            socket.off("message:new", handleNewMessage);
            socket.off("message:update", handleUpdateMessage);
            socket.off("message:delete", handleDeleteMessage);
            socket.off("reaction:add", handleAddReaction);
            socket.off("reaction:remove", handleRemoveReaction);
        };
    }, [socket, channelId, conversationId]);

    // Fetch messages when channel/conversation changes
    useEffect(() => {
        setState({
            messages: [],
            isLoading: true,
            error: null,
            hasMore: true,
            nextCursor: null
        });
        fetchMessages();
    }, [fetchMessages]);

    // Send message
    const sendMessage = useCallback(
        async (content: string, parentId?: string) => {
            if (!channelId && !conversationId) return;

            const endpoint = channelId
                ? `/api/channels/${channelId}/messages`
                : `/api/dm/${conversationId}/messages`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, parentId })
            });

            if (!response.ok) {
                throw new Error("Failed to send message");
            }

            const newMessage = await response.json();

            // Optimistically add the message to state
            setState((prev) => ({
                ...prev,
                messages: [...prev.messages, newMessage]
            }));

            return newMessage;
        },
        [channelId, conversationId]
    );

    // Edit message
    const editMessage = useCallback(async (messageId: string, content: string) => {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error("Failed to edit message");
        }

        const updatedMessage = await response.json();

        // Merge with existing message to preserve reactions and attachments
        setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
                m.id === messageId
                    ? {
                          ...m,
                          ...updatedMessage,
                          reactions: m.reactions,
                          attachments: m.attachments
                      }
                    : m
            )
        }));

        return updatedMessage;
    }, []);

    // Delete message
    const deleteMessage = useCallback(async (messageId: string) => {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Failed to delete message");
        }

        // Remove the message from state
        setState((prev) => ({
            ...prev,
            messages: prev.messages.filter((m) => m.id !== messageId)
        }));
    }, []);

    // Toggle reaction
    const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
        const response = await fetch(`/api/messages/${messageId}/reactions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji })
        });

        if (!response.ok) {
            throw new Error("Failed to toggle reaction");
        }

        const result = await response.json();

        // Update reactions in state
        setState((prev) => ({
            ...prev,
            messages: prev.messages.map((m) => {
                if (m.id !== messageId) return m;

                const reactions = m.reactions || [];

                if (result.action === "removed") {
                    // Remove the reaction
                    return {
                        ...m,
                        reactions: reactions
                            .map((r) => {
                                if (r.emoji !== emoji) return r;
                                return {
                                    ...r,
                                    count: r.count - 1,
                                    users: r.users.filter((u) => u.id !== result.userId)
                                };
                            })
                            .filter((r) => r.count > 0)
                    };
                } else {
                    // Add the reaction
                    const existing = reactions.find((r) => r.emoji === emoji);
                    if (existing) {
                        return {
                            ...m,
                            reactions: reactions.map((r) =>
                                r.emoji === emoji
                                    ? {
                                          ...r,
                                          count: r.count + 1,
                                          users: [
                                              ...r.users,
                                              { id: result.userId, name: result.userName }
                                          ]
                                      }
                                    : r
                            )
                        };
                    }
                    return {
                        ...m,
                        reactions: [
                            ...reactions,
                            {
                                emoji,
                                count: 1,
                                users: [{ id: result.userId, name: result.userName }]
                            }
                        ]
                    };
                }
            })
        }));

        return result;
    }, []);

    return {
        ...state,
        loadMore,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        refetch: () => fetchMessages()
    };
}
