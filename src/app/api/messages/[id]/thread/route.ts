import { and, asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { channelMembers, channels, messages } from "@/db/schema";
import {
    forbidden,
    getAuthenticatedUser,
    notFound,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canViewChannel } from "@/lib/permissions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/messages/[id]/thread - Get thread replies
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id: parentId } = await params;

        // Get the parent message
        const parentMessage = await db.query.messages.findFirst({
            where: and(eq(messages.id, parentId), isNull(messages.deletedAt)),
            with: {
                author: {
                    columns: { id: true, name: true, image: true }
                }
            }
        });

        if (!parentMessage) {
            return notFound("Message");
        }

        // Verify user can access the channel
        if (parentMessage.channelId) {
            const channel = await db.query.channels.findFirst({
                where: eq(channels.id, parentMessage.channelId)
            });

            if (!channel) {
                return notFound("Channel");
            }

            const membership = await db.query.channelMembers.findFirst({
                where: and(
                    eq(channelMembers.channelId, parentMessage.channelId),
                    eq(channelMembers.userId, user.id)
                )
            });

            if (!canViewChannel(user, channel, membership)) {
                return forbidden();
            }
        }

        // Get all replies
        const replies = await db.query.messages.findMany({
            where: and(eq(messages.parentId, parentId), isNull(messages.deletedAt)),
            orderBy: [asc(messages.createdAt)],
            with: {
                author: {
                    columns: { id: true, name: true, image: true }
                }
            }
        });

        // Format response
        const formattedParent = {
            ...parentMessage,
            createdAt: parentMessage.createdAt.toISOString(),
            editedAt: parentMessage.editedAt?.toISOString() || null
        };

        const formattedReplies = replies.map((msg) => ({
            ...msg,
            createdAt: msg.createdAt.toISOString(),
            editedAt: msg.editedAt?.toISOString() || null
        }));

        return NextResponse.json({
            parent: formattedParent,
            replies: formattedReplies,
            replyCount: replies.length
        });
    } catch (error) {
        console.error("Error getting thread:", error);
        return serverError();
    }
}
