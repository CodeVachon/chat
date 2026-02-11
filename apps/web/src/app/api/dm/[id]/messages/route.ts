import { db } from "@chat/db";
import { attachments, conversationParticipants, messages, reactions } from "@chat/db/schema";
import type { MessagePayload } from "@chat/events";
import { emitToConversation } from "@chat/events/publisher";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
    badRequest,
    forbidden,
    getAuthenticatedUser,
    serverError,
    unauthorized
} from "@/lib/api-utils";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/dm/[id]/messages - Get paginated DM messages
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get("cursor");
        const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

        // Verify user is part of this conversation
        const participation = await db.query.conversationParticipants.findFirst({
            where: and(
                eq(conversationParticipants.conversationId, id),
                eq(conversationParticipants.userId, user.id)
            )
        });

        if (!participation) {
            return forbidden();
        }

        // Get messages with cursor-based pagination
        const messageList = await db.query.messages.findMany({
            where: and(
                eq(messages.conversationId, id),
                isNull(messages.deletedAt),
                cursor ? lt(messages.createdAt, new Date(cursor)) : undefined
            ),
            orderBy: [desc(messages.createdAt)],
            limit: limit + 1,
            with: {
                author: {
                    columns: { id: true, name: true, image: true }
                }
            }
        });

        const hasMore = messageList.length > limit;
        const messagesToReturn = hasMore ? messageList.slice(0, -1) : messageList;

        // Get reactions and attachments
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

        const messageAttachments =
            messageIds.length > 0
                ? await db.query.attachments.findMany({
                      where: or(...messageIds.map((mid) => eq(attachments.messageId, mid)))
                  })
                : [];

        // Group by message
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

        const formattedMessages = messagesToReturn.map((msg) => ({
            ...msg,
            createdAt: msg.createdAt.toISOString(),
            editedAt: msg.editedAt?.toISOString() || null,
            reactions: reactionsByMessage.get(msg.id) || [],
            attachments: attachmentsByMessage.get(msg.id) || []
        }));

        return NextResponse.json({
            messages: formattedMessages.reverse(),
            nextCursor: hasMore
                ? messagesToReturn[messagesToReturn.length - 1].createdAt.toISOString()
                : null
        });
    } catch (error) {
        console.error("Error getting DM messages:", error);
        return serverError();
    }
}

// POST /api/dm/[id]/messages - Send DM message
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id } = await params;

        // Verify user is part of this conversation
        const participation = await db.query.conversationParticipants.findFirst({
            where: and(
                eq(conversationParticipants.conversationId, id),
                eq(conversationParticipants.userId, user.id)
            )
        });

        if (!participation) {
            return forbidden();
        }

        const body = await request.json();
        const { content } = body;

        if (!content || content.trim().length === 0) {
            return badRequest("Message content is required");
        }

        // Create message
        const [newMessage] = await db
            .insert(messages)
            .values({
                content: content.trim(),
                conversationId: id,
                authorId: user.id
            })
            .returning();

        const messagePayload: MessagePayload = {
            id: newMessage.id,
            content: newMessage.content,
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

        // Emit to conversation
        emitToConversation(id, "message:new", messagePayload);

        return NextResponse.json(messagePayload, { status: 201 });
    } catch (error) {
        console.error("Error sending DM:", error);
        return serverError();
    }
}
