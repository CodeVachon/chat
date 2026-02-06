import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { channelMembers, channels, users } from "@/db/schema";
import {
    badRequest,
    forbidden,
    getAuthenticatedUser,
    notFound,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canInviteToChannel, canViewChannel } from "@/lib/permissions";
import { emitToChannel } from "@/lib/socket";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/channels/[id]/members - List channel members
export async function GET(request: Request, { params }: RouteParams) {
    try {
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

        if (!canViewChannel(user, channel, membership)) {
            return forbidden();
        }

        const members = await db.query.channelMembers.findMany({
            where: eq(channelMembers.channelId, id),
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        image: true,
                        status: true,
                        statusMessage: true
                    }
                }
            }
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error("Error listing members:", error);
        return serverError();
    }
}

// POST /api/channels/[id]/members - Add member to channel
export async function POST(request: Request, { params }: RouteParams) {
    try {
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

        if (!canInviteToChannel(user, channel, membership)) {
            return forbidden();
        }

        const body = await request.json();
        const { userId, role = "member" } = body;

        if (!userId) {
            return badRequest("User ID is required");
        }

        // Check if target user exists
        const targetUser = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });

        if (!targetUser) {
            return notFound("User");
        }

        // Check if already a member
        const existingMembership = await db.query.channelMembers.findFirst({
            where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, userId))
        });

        if (existingMembership) {
            return badRequest("User is already a member of this channel");
        }

        // Can only assign roles up to own level
        const validRoles = ["member"];
        if (
            membership?.role === "admin" ||
            membership?.role === "owner" ||
            user.orgRole !== "member"
        ) {
            validRoles.push("admin");
        }
        if (membership?.role === "owner" || user.orgRole === "owner") {
            validRoles.push("owner");
        }

        const assignedRole = validRoles.includes(role) ? role : "member";

        const [newMember] = await db
            .insert(channelMembers)
            .values({
                channelId: id,
                userId,
                role: assignedRole
            })
            .returning();

        // Emit member join event
        emitToChannel(id, "member:join", {
            channelId: id,
            userId: targetUser.id,
            userName: targetUser.name,
            role: assignedRole
        });

        return NextResponse.json(
            {
                ...newMember,
                user: {
                    id: targetUser.id,
                    name: targetUser.name,
                    image: targetUser.image
                }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error adding member:", error);
        return serverError();
    }
}
