// Socket.io event types

export interface ServerToClientEvents {
    // Messages
    "message:new": (data: MessagePayload) => void;
    "message:update": (data: MessagePayload) => void;
    "message:delete": (data: {
        messageId: string;
        channelId?: string;
        conversationId?: string;
    }) => void;

    // Reactions
    "reaction:add": (data: ReactionPayload) => void;
    "reaction:remove": (data: ReactionPayload) => void;

    // Typing
    "typing:start": (data: TypingPayload) => void;
    "typing:stop": (data: TypingPayload) => void;

    // Presence
    "presence:update": (data: PresencePayload) => void;

    // Channels
    "channel:update": (data: ChannelPayload) => void;
    "member:join": (data: MemberPayload) => void;
    "member:leave": (data: MemberPayload) => void;

    // System
    error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
    // Messages
    "message:send": (
        data: {
            content: string;
            channelId?: string;
            conversationId?: string;
            parentId?: string;
        },
        callback: (response: { success: boolean; message?: MessagePayload; error?: string }) => void
    ) => void;
    "message:edit": (
        data: { messageId: string; content: string },
        callback: (response: { success: boolean; error?: string }) => void
    ) => void;
    "message:delete": (
        data: { messageId: string },
        callback: (response: { success: boolean; error?: string }) => void
    ) => void;

    // Reactions
    "reaction:toggle": (
        data: { messageId: string; emoji: string },
        callback: (response: {
            success: boolean;
            action?: "added" | "removed";
            error?: string;
        }) => void
    ) => void;

    // Typing
    "typing:start": (data: { channelId?: string; conversationId?: string }) => void;
    "typing:stop": (data: { channelId?: string; conversationId?: string }) => void;

    // Rooms
    "join:channel": (channelId: string) => void;
    "leave:channel": (channelId: string) => void;
    "join:conversation": (conversationId: string) => void;
    "leave:conversation": (conversationId: string) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    userId: string;
    userName: string;
}

// Payload types
export interface MessagePayload {
    id: string;
    content: string;
    channelId?: string | null;
    conversationId?: string | null;
    authorId: string;
    parentId?: string | null;
    createdAt: string;
    editedAt?: string | null;
    author: {
        id: string;
        name: string;
        image?: string | null;
    };
    attachments?: AttachmentPayload[];
    reactions?: ReactionCount[];
}

export interface AttachmentPayload {
    id: string;
    url: string;
    filename: string;
    mimeType?: string | null;
    size?: number | null;
    width?: number | null;
    height?: number | null;
}

export interface ReactionPayload {
    messageId: string;
    userId: string;
    emoji: string;
    userName: string;
}

export interface ReactionCount {
    emoji: string;
    count: number;
    users: { id: string; name: string }[];
}

export interface TypingPayload {
    userId: string;
    userName: string;
    channelId?: string;
    conversationId?: string;
}

export interface PresencePayload {
    userId: string;
    status: "online" | "away" | "dnd" | "offline";
    lastSeenAt?: string;
}

export interface ChannelPayload {
    id: string;
    name: string;
    emoji?: string | null;
    description?: string | null;
    isPrivate: boolean;
}

export interface MemberPayload {
    channelId: string;
    userId: string;
    userName: string;
    role: "owner" | "admin" | "member";
}
