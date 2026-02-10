"use client";

import { use, useCallback, useEffect, useState } from "react";

import { MessageInput, MessageList, TypingIndicator } from "@/components/chat";
import { Header, MemberList } from "@/components/layout";
import { useMessages, useSocket, useTyping } from "@/hooks";
import { useSession } from "@/lib/auth-client";

interface ChannelPageProps {
    params: Promise<{ id: string }>;
}

interface Channel {
    id: string;
    name: string;
    emoji?: string | null;
    description?: string | null;
    isPrivate: boolean;
}

interface Member {
    userId: string;
    role: "owner" | "admin" | "member";
    user: {
        id: string;
        name: string;
        image?: string | null;
        status?: "online" | "away" | "dnd" | "offline" | null;
        statusMessage?: string | null;
    };
}

export default function ChannelPage({ params }: ChannelPageProps) {
    const { id: channelId } = use(params);
    const { data: session } = useSession();
    const [channel, setChannel] = useState<Channel | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [showMembers, setShowMembers] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const { socket, joinChannel, leaveChannel } = useSocket();

    const {
        messages,
        isLoading: messagesLoading,
        hasMore,
        loadMore,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction
    } = useMessages({ socket, channelId });

    const { typingUsers, startTyping, stopTyping } = useTyping({ socket, channelId });

    // Fetch channel details
    useEffect(() => {
        const fetchChannel = async () => {
            try {
                const response = await fetch(`/api/channels/${channelId}`);
                if (response.ok) {
                    const data = await response.json();
                    setChannel(data);
                }
            } catch (err) {
                console.error("Error fetching channel:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChannel();
    }, [channelId]);

    // Fetch members
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch(`/api/channels/${channelId}/members`);
                if (response.ok) {
                    const data = await response.json();
                    setMembers(data);
                }
            } catch (err) {
                console.error("Error fetching members:", err);
            }
        };

        fetchMembers();
    }, [channelId]);

    // Join/leave channel room
    useEffect(() => {
        if (socket && channelId) {
            joinChannel(channelId);
            return () => leaveChannel(channelId);
        }
    }, [socket, channelId, joinChannel, leaveChannel]);

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

    if (!channel) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Channel not found</p>
            </div>
        );
    }

    return (
        <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col">
                <Header
                    type="channel"
                    name={channel.name}
                    emoji={channel.emoji}
                    description={channel.description}
                    onMembersClick={() => setShowMembers(!showMembers)}
                />

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
                    placeholder={`Message #${channel.name}`}
                />
            </div>

            {showMembers && <MemberList members={members} />}
        </div>
    );
}
