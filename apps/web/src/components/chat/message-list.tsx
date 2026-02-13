"use client";

import type { MessagePayload } from "@chat/events";
import { useVirtualizer } from "@tanstack/react-virtual";
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
    const prevMessagesLengthRef = useRef(messages.length);

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 60,
        overscan: 10,
        getItemKey: (index) => messages[index].id
    });

    // Scroll to bottom on new messages (appended at end)
    useEffect(() => {
        if (messages.length > prevMessagesLengthRef.current) {
            // Only auto-scroll if we were already near the bottom
            const el = scrollRef.current;
            if (el) {
                const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
                if (isNearBottom) {
                    requestAnimationFrame(() => {
                        virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
                    });
                }
            }
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages.length, virtualizer]);

    // Initial scroll to bottom
    useEffect(() => {
        if (messages.length > 0) {
            virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle scroll for loading more (when scrolled to top)
    const handleScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            const target = e.currentTarget;
            if (target.scrollTop === 0 && hasMore && !isLoading) {
                onLoadMore();
            }
        },
        [hasMore, isLoading, onLoadMore]
    );

    const virtualItems = virtualizer.getVirtualItems();

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

                {messages.length > 0 && (
                    <div
                        className="relative w-full"
                        style={{ height: `${virtualizer.getTotalSize()}px` }}
                    >
                        {virtualItems.map((virtualItem) => {
                            const message = messages[virtualItem.index];
                            const prevMessage =
                                virtualItem.index > 0 ? messages[virtualItem.index - 1] : null;
                            const showAvatar =
                                !prevMessage ||
                                prevMessage.authorId !== message.authorId ||
                                new Date(message.createdAt).getTime() -
                                    new Date(prevMessage.createdAt).getTime() >
                                    5 * 60 * 1000;

                            return (
                                <div
                                    key={virtualItem.key}
                                    ref={virtualizer.measureElement}
                                    data-index={virtualItem.index}
                                    className="absolute top-0 left-0 w-full"
                                    style={{
                                        transform: `translateY(${virtualItem.start}px)`
                                    }}
                                >
                                    <MessageItem
                                        message={message}
                                        isOwn={message.authorId === currentUserId}
                                        showAvatar={showAvatar}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onReact={onReact}
                                        onThreadClick={onThreadClick}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
