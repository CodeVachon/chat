"use client";

import { use, useCallback, useEffect, useState } from "react";

import { MessageInput, MessageList, TypingIndicator } from "@/components/chat";
import { Header } from "@/components/layout";
import { useMessages, useSocket, useTyping } from "@/hooks";
import { useSession } from "@/lib/auth-client";

interface DMPageProps {
    params: Promise<{ id: string }>;
}

interface Participant {
    id: string;
    name: string;
    image?: string | null;
    status?: "online" | "away" | "dnd" | "offline" | null;
}

export default function DMPage({ params }: DMPageProps) {
    const { id: conversationId } = use(params);
    const { data: session } = useSession();
    const [otherUser, setOtherUser] = useState<Participant | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { socket, joinConversation, leaveConversation } = useSocket();

    const {
        messages,
        isLoading: messagesLoading,
        hasMore,
        loadMore,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction
    } = useMessages({ socket, conversationId });

    const { typingUsers, startTyping, stopTyping } = useTyping({ socket, conversationId });

    // Fetch conversation details
    useEffect(() => {
        const fetchConversation = async () => {
            try {
                const response = await fetch("/api/dm");
                if (response.ok) {
                    const conversations = await response.json();
                    const conv = conversations.find((c: { id: string }) => c.id === conversationId);
                    if (conv && conv.participants[0]) {
                        setOtherUser(conv.participants[0]);
                    }
                }
            } catch (err) {
                console.error("Error fetching conversation:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversation();
    }, [conversationId]);

    // Join/leave conversation room
    useEffect(() => {
        if (socket && conversationId) {
            joinConversation(conversationId);
            return () => leaveConversation(conversationId);
        }
    }, [socket, conversationId, joinConversation, leaveConversation]);

    const handleSend = useCallback(
        async (content: string) => {
            stopTyping();
            await sendMessage(content);
        },
        [sendMessage, stopTyping]
    );

    const handleEdit = useCallback(
        async (messageId: string, content: string) => {
            await editMessage(messageId, content);
        },
        [editMessage]
    );

    const handleDelete = useCallback(
        async (messageId: string) => {
            await deleteMessage(messageId);
        },
        [deleteMessage]
    );

    const handleReact = useCallback(
        async (messageId: string, emoji: string) => {
            await toggleReaction(messageId, emoji);
        },
        [toggleReaction]
    );

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    if (!otherUser) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Conversation not found</p>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <Header type="dm" name={otherUser.name} />

            <MessageList
                messages={messages}
                currentUserId={session?.user?.id || ""}
                isLoading={messagesLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReact={handleReact}
            />

            <TypingIndicator typingUsers={typingUsers} />

            <MessageInput
                onSend={handleSend}
                onTyping={startTyping}
                placeholder={`Message ${otherUser.name}`}
            />
        </div>
    );
}
