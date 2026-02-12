import { db } from "@chat/db";
import { channelMembers, channels, messages, reactions } from "@chat/db/schema";
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
import { canViewChannel } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { validateEmoji } from "@/lib/validators";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/messages/[id]/reactions - Toggle reaction
export async function POST(request: Request, { params }: RouteParams) {
    try {
        // Rate limit: 60 reactions per minute per IP
        const rateLimited = await rateLimit("reactions", 60, 60_000);
        if (rateLimited) return rateLimited;

        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id: messageId } = await params;

        const body = await request.json();
        const { emoji } = body;

        const emojiError = validateEmoji(emoji);
        if (emojiError) {
            return badRequest(emojiError);
        }

        const message = await db.query.messages.findFirst({
            where: and(eq(messages.id, messageId), isNull(messages.deletedAt))
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

        // Check if reaction already exists
        const existingReaction = await db.query.reactions.findFirst({
            where: and(
                eq(reactions.messageId, messageId),
                eq(reactions.userId, user.id),
                eq(reactions.emoji, emoji)
            )
        });

        let action: "added" | "removed";

        if (existingReaction) {
            // Remove reaction
            await db
                .delete(reactions)
                .where(
                    and(
                        eq(reactions.messageId, messageId),
                        eq(reactions.userId, user.id),
                        eq(reactions.emoji, emoji)
                    )
                );
            action = "removed";
        } else {
            // Add reaction
            await db.insert(reactions).values({
                messageId,
                userId: user.id,
                emoji
            });
            action = "added";
        }

        const payload = {
            messageId,
            userId: user.id,
            emoji,
            userName: user.name
        };

        // Emit reaction event
        if (message.channelId) {
            emitToChannel(
                message.channelId,
                action === "added" ? "reaction:add" : "reaction:remove",
                payload
            );
        } else if (message.conversationId) {
            emitToConversation(
                message.conversationId,
                action === "added" ? "reaction:add" : "reaction:remove",
                payload
            );
        }

        return NextResponse.json({ action, userId: user.id, userName: user.name });
    } catch (error) {
        console.error("Error toggling reaction:", error);
        return serverError();
    }
}
