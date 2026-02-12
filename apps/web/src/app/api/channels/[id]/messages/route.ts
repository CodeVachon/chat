import { db } from "@chat/db";
import { attachments, channelMembers, channels, messages, reactions } from "@chat/db/schema";
import type { MessagePayload } from "@chat/events";
import { emitToChannel } from "@chat/events/publisher";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
    badRequest,
    forbidden,
    getAuthenticatedUser,
    notFound,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canPostInChannel, canViewChannel } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/channels/[id]/messages - Get paginated messages
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get("cursor");
        const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

        const channel = await db.query.channels.findFirst({
            where: and(eq(channels.id, id), isNull(channels.archivedAt))
        });

        if (!channel) {
            return notFound("Channel");
        }

        const membership = await db.query.channelMembers.findFirst({
            where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, user.id))
        });

        if (!canViewChannel(user, channel, membership)) {
            return forbidden();
        }

        // Get messages with cursor-based pagination
        const messageList = await db.query.messages.findMany({
            where: and(
                eq(messages.channelId, id),
                isNull(messages.deletedAt),
                isNull(messages.parentId), // Only get top-level messages
                cursor ? lt(messages.createdAt, new Date(cursor)) : undefined
            ),
            orderBy: [desc(messages.createdAt)],
            limit: limit + 1, // Get one extra to check if there are more
            with: {
                author: {
                    columns: { id: true, name: true, image: true }
                }
            }
        });

        const hasMore = messageList.length > limit;
        const messagesToReturn = hasMore ? messageList.slice(0, -1) : messageList;

        // Get reactions for these messages
        const messageIds = messagesToReturn.map((m) => m.id);
        const messageReactions =
            messageIds.length > 0
                ? await db.query.reactions.findMany({
                      where: or(...messageIds.map((mid) => eq(reactions.messageId, mid))),
                      with: {
                          user: {
                              columns: { id: true, name: true }
                          }
                      }
                  })
                : [];

        // Get attachments for these messages
        const messageAttachments =
            messageIds.length > 0
                ? await db.query.attachments.findMany({
                      where: or(...messageIds.map((mid) => eq(attachments.messageId, mid)))
                  })
                : [];

        // Group reactions and attachments by message
        const reactionsByMessage = new Map<
            string,
            { emoji: string; count: number; users: { id: string; name: string }[] }[]
        >();
        const attachmentsByMessage = new Map<string, (typeof messageAttachments)[0][]>();

        for (const reaction of messageReactions) {
            const msgReactions = reactionsByMessage.get(reaction.messageId) || [];
            const existing = msgReactions.find((r) => r.emoji === reaction.emoji);
            if (existing) {
                existing.count++;
                existing.users.push({ id: reaction.user.id, name: reaction.user.name });
            } else {
                msgReactions.push({
                    emoji: reaction.emoji,
                    count: 1,
                    users: [{ id: reaction.user.id, name: reaction.user.name }]
                });
            }
            reactionsByMessage.set(reaction.messageId, msgReactions);
        }

        for (const attachment of messageAttachments) {
            const msgAttachments = attachmentsByMessage.get(attachment.messageId) || [];
            msgAttachments.push(attachment);
            attachmentsByMessage.set(attachment.messageId, msgAttachments);
        }

        // Format response
        const formattedMessages = messagesToReturn.map((msg) => ({
            ...msg,
            createdAt: msg.createdAt.toISOString(),
            editedAt: msg.editedAt?.toISOString() || null,
            reactions: reactionsByMessage.get(msg.id) || [],
            attachments: attachmentsByMessage.get(msg.id) || []
        }));

        return NextResponse.json({
            messages: formattedMessages.reverse(), // Return in chronological order
            nextCursor: hasMore
                ? messagesToReturn[messagesToReturn.length - 1].createdAt.toISOString()
                : null
        });
    } catch (error) {
        console.error("Error getting messages:", error);
        return serverError();
    }
}

// POST /api/channels/[id]/messages - Send a message
export async function POST(request: Request, { params }: RouteParams) {
    try {
        // Rate limit: 30 messages per minute per IP
        const rateLimited = await rateLimit("channel-messages", 30, 60_000);
        if (rateLimited) return rateLimited;

        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id } = await params;

        const channel = await db.query.channels.findFirst({
            where: and(eq(channels.id, id), isNull(channels.archivedAt))
        });

        if (!channel) {
            return notFound("Channel");
        }

        const membership = await db.query.channelMembers.findFirst({
            where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, user.id))
        });

        if (!canPostInChannel(user, channel, membership)) {
            return forbidden();
        }

        const body = await request.json();
        const { content, parentId } = body;

        if (!content || content.trim().length === 0) {
            return badRequest("Message content is required");
        }

        // If replying to a thread, verify the parent message exists
        if (parentId) {
            const parentMessage = await db.query.messages.findFirst({
                where: and(
                    eq(messages.id, parentId),
                    eq(messages.channelId, id),
                    isNull(messages.deletedAt)
                )
            });

            if (!parentMessage) {
                return badRequest("Parent message not found");
            }
        }

        // Create message
        const [newMessage] = await db
            .insert(messages)
            .values({
                content: content.trim(),
                channelId: id,
                authorId: user.id,
                parentId: parentId || null
            })
            .returning();

        // If user isn't a member of the channel yet (for public channels), add them
        if (!membership && !channel.isPrivate) {
            await db.insert(channelMembers).values({
                channelId: id,
                userId: user.id,
                role: "member"
            });
        }

        // Format for socket emission
        const messagePayload: MessagePayload = {
            id: newMessage.id,
            content: newMessage.content,
            contentHtml: newMessage.contentHtml,
            channelId: newMessage.channelId,
            conversationId: newMessage.conversationId,
            authorId: newMessage.authorId,
            parentId: newMessage.parentId,
            createdAt: newMessage.createdAt.toISOString(),
            editedAt: newMessage.editedAt?.toISOString() || null,
            author: {
                id: user.id,
                name: user.name,
                image: user.image
            },
            reactions: [],
            attachments: []
        };

        // Emit to channel
        emitToChannel(id, "message:new", messagePayload);

        return NextResponse.json(messagePayload, { status: 201 });
    } catch (error) {
        console.error("Error sending message:", error);
        return serverError();
    }
}
