import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { conversationParticipants, conversations, users } from "@/db/schema";
import {
    badRequest,
    getAuthenticatedUser,
    notFound,
    serverError,
    unauthorized
} from "@/lib/api-utils";

// GET /api/dm - List user's DM conversations
export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        // Get all conversations user is part of
        const userConversations = await db.query.conversationParticipants.findMany({
            where: eq(conversationParticipants.userId, user.id),
            columns: { conversationId: true }
        });

        const conversationIds = userConversations.map((c) => c.conversationId);

        if (conversationIds.length === 0) {
            return NextResponse.json([]);
        }

        // Get conversation details with other participants
        const conversationList = await db.query.conversations.findMany({
            where: inArray(conversations.id, conversationIds),
            with: {
                participants: {
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                image: true,
                                status: true
                            }
                        }
                    }
                }
            }
        });

        // Format response - filter out current user from participants
        const formatted = conversationList.map((conv) => ({
            id: conv.id,
            type: conv.type,
            createdAt: conv.createdAt.toISOString(),
            participants: conv.participants
                .filter((p) => p.userId !== user.id)
                .map((p) => ({
                    ...p.user,
                    lastReadAt: p.lastReadAt?.toISOString() || null
                }))
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error("Error listing DMs:", error);
        return serverError();
    }
}

// POST /api/dm - Start or get existing DM conversation
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const body = await request.json();
        const { userId: targetUserId } = body;

        if (!targetUserId) {
            return badRequest("User ID is required");
        }

        if (targetUserId === user.id) {
            return badRequest("Cannot start DM with yourself");
        }

        // Check if target user exists
        const targetUser = await db.query.users.findFirst({
            where: eq(users.id, targetUserId)
        });

        if (!targetUser) {
            return notFound("User");
        }

        // Check if DM already exists between these users
        const userConversations = await db.query.conversationParticipants.findMany({
            where: eq(conversationParticipants.userId, user.id),
            columns: { conversationId: true }
        });

        const conversationIds = userConversations.map((c) => c.conversationId);

        if (conversationIds.length > 0) {
            const existingDM = await db.query.conversationParticipants.findFirst({
                where: and(
                    eq(conversationParticipants.userId, targetUserId),
                    inArray(conversationParticipants.conversationId, conversationIds)
                ),
                with: {
                    conversation: true
                }
            });

            if (existingDM) {
                return NextResponse.json({
                    id: existingDM.conversation.id,
                    type: existingDM.conversation.type,
                    createdAt: existingDM.conversation.createdAt.toISOString(),
                    isNew: false
                });
            }
        }

        // Create new DM conversation
        const [newConversation] = await db.insert(conversations).values({ type: "dm" }).returning();

        // Add both users as participants
        await db.insert(conversationParticipants).values([
            { conversationId: newConversation.id, userId: user.id },
            { conversationId: newConversation.id, userId: targetUserId }
        ]);

        return NextResponse.json(
            {
                id: newConversation.id,
                type: newConversation.type,
                createdAt: newConversation.createdAt.toISOString(),
                isNew: true
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating DM:", error);
        return serverError();
    }
}
