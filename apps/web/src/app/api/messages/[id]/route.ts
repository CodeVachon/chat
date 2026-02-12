import { db } from "@chat/db";
import { channelMembers, channels, messages, users } from "@chat/db/schema";
import { emitToChannel, emitToConversation } from "@chat/events/publisher";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
    badRequest,
    forbidden,
    getAuthenticatedUser,
    notFound,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canDeleteMessage, canEditMessage, canViewChannel } from "@/lib/permissions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/messages/[id] - Get single message
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id } = await params;

        const message = await db.query.messages.findFirst({
            where: and(eq(messages.id, id), isNull(messages.deletedAt)),
            with: {
                author: {
                    columns: { id: true, name: true, image: true }
                }
            }
        });

        if (!message) {
            return notFound("Message");
        }

        // Verify user can access the channel/conversation
        if (message.channelId) {
            const channel = await db.query.channels.findFirst({
                where: eq(channels.id, message.channelId)
            });

            if (!channel) {
                return notFound("Channel");
            }

            const membership = await db.query.channelMembers.findFirst({
                where: and(
                    eq(channelMembers.channelId, message.channelId),
                    eq(channelMembers.userId, user.id)
                )
            });

            if (!canViewChannel(user, channel, membership)) {
                return forbidden();
            }
        }

        return NextResponse.json({
            ...message,
            createdAt: message.createdAt.toISOString(),
            editedAt: message.editedAt?.toISOString() || null
        });
    } catch (error) {
        console.error("Error getting message:", error);
        return serverError();
    }
}

// PATCH /api/messages/[id] - Edit message
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id } = await params;

        const message = await db.query.messages.findFirst({
            where: and(eq(messages.id, id), isNull(messages.deletedAt))
        });

        if (!message) {
            return notFound("Message");
        }

        if (!canEditMessage(user, message)) {
            return forbidden();
        }

        const body = await request.json();
        const { content } = body;

        if (!content || content.trim().length === 0) {
            return badRequest("Message content is required");
        }

        const [updatedMessage] = await db
            .update(messages)
            .set({
                content: content.trim(),
                editedAt: new Date()
            })
            .where(eq(messages.id, id))
            .returning();

        // Get author info for response
        const authorResult = await db.query.users.findFirst({
            where: eq(users.id, message.authorId),
            columns: { id: true, name: true, image: true }
        });

        const payload = {
            id: updatedMessage.id,
            content: updatedMessage.content,
            channelId: updatedMessage.channelId,
            conversationId: updatedMessage.conversationId,
            authorId: updatedMessage.authorId,
            parentId: updatedMessage.parentId,
            createdAt: updatedMessage.createdAt.toISOString(),
            editedAt: updatedMessage.editedAt?.toISOString() || null,
            author: authorResult!
        };

        // Emit update event
        if (updatedMessage.channelId) {
            emitToChannel(updatedMessage.channelId, "message:update", payload);
        } else if (updatedMessage.conversationId) {
            emitToConversation(updatedMessage.conversationId, "message:update", payload);
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Error editing message:", error);
        return serverError();
    }
}

// DELETE /api/messages/[id] - Delete message
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id } = await params;

        const message = await db.query.messages.findFirst({
            where: and(eq(messages.id, id), isNull(messages.deletedAt))
        });

        if (!message) {
            return notFound("Message");
        }

        // Get channel membership if applicable
        let channelMembership = null;
        if (message.channelId) {
            channelMembership = await db.query.channelMembers.findFirst({
                where: and(
                    eq(channelMembers.channelId, message.channelId),
                    eq(channelMembers.userId, user.id)
                )
            });
        }

        if (!canDeleteMessage(user, message, channelMembership)) {
            return forbidden();
        }

        // Soft delete
        await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, id));

        // Emit delete event
        if (message.channelId) {
            emitToChannel(message.channelId, "message:delete", {
                messageId: id,
                channelId: message.channelId
            });
        } else if (message.conversationId) {
            emitToConversation(message.conversationId, "message:delete", {
                messageId: id,
                conversationId: message.conversationId
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting message:", error);
        return serverError();
    }
}
