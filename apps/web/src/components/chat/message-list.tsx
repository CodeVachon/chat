"use client";

import type { MessagePayload } from "@chat/events";
import { useCallback, useEffect, useRef } from "react";

import { MessageItem } from "./message-item";

interface MessageListProps {
    messages: MessagePayload[];
    currentUserId: string;
    isLoading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    onEdit: (messageId: string, content: string) => void;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, emoji: string) => void;
    onThreadClick?: (messageId: string) => void;
}

export function MessageList({
    messages,
    currentUserId,
    isLoading,
    hasMore,
    onLoadMore,
    onEdit,
    onDelete,
    onReact,
    onThreadClick
}: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevMessagesLengthRef = useRef(messages.length);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > prevMessagesLengthRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages.length]);

    // Initial scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView();
    }, []);

    // Handle scroll for loading more
    const handleScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            const target = e.currentTarget;
            if (target.scrollTop === 0 && hasMore && !isLoading) {
                onLoadMore();
            }
        },
        [hasMore, isLoading, onLoadMore]
    );

    return (
        <div className="flex-1 overflow-hidden">
            <div
                ref={scrollRef}
                className="h-full overflow-y-auto px-4 py-2"
                onScroll={handleScroll}
            >
                {isLoading && hasMore && (
                    <div className="flex justify-center py-2">
                        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                    </div>
                )}

                {messages.length === 0 && !isLoading && (
                    <div className="text-muted-foreground flex h-full items-center justify-center">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                )}

                <div className="space-y-1">
                    {messages.map((message, index) => {
                        const prevMessage = index > 0 ? messages[index - 1] : null;
                        const showAvatar =
                            !prevMessage ||
                            prevMessage.authorId !== message.authorId ||
                            new Date(message.createdAt).getTime() -
                                new Date(prevMessage.createdAt).getTime() >
                                5 * 60 * 1000;

                        return (
                            <MessageItem
                                key={message.id}
                                message={message}
                                isOwn={message.authorId === currentUserId}
                                showAvatar={showAvatar}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onReact={onReact}
                                onThreadClick={onThreadClick}
                            />
                        );
                    })}
                </div>

                <div ref={bottomRef} />
            </div>
        </div>
    );
}
