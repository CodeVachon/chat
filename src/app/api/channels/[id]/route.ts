import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { channelMembers, channels } from "@/db/schema";
import {
    badRequest,
    forbidden,
    getAuthenticatedUser,
    notFound,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canManageChannel, canViewChannel } from "@/lib/permissions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/channels/[id] - Get channel details
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

        // Check if user can view this channel
        const membership = await db.query.channelMembers.findFirst({
            where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, user.id))
        });

        if (!canViewChannel(user, channel, membership)) {
            return forbidden();
        }

        return NextResponse.json({
            ...channel,
            membership: membership || null
        });
    } catch (error) {
        console.error("Error getting channel:", error);
        return serverError();
    }
}

// PATCH /api/channels/[id] - Update channel
export async function PATCH(request: Request, { params }: RouteParams) {
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

        if (!canManageChannel(user, channel, membership)) {
            return forbidden();
        }

        const body = await request.json();
        const { name, emoji, description, isPrivate } = body;

        const updates: Partial<typeof channels.$inferInsert> = {};

        if (name !== undefined) {
            if (!name || name.trim().length === 0) {
                return badRequest("Channel name is required");
            }
            if (name.length > 80) {
                return badRequest("Channel name must be 80 characters or less");
            }
            updates.name = name.trim();
        }

        if (emoji !== undefined) {
            updates.emoji = emoji || null;
        }

        if (description !== undefined) {
            updates.description = description || null;
        }

        if (isPrivate !== undefined) {
            updates.isPrivate = isPrivate;
        }

        if (Object.keys(updates).length === 0) {
            return badRequest("No valid updates provided");
        }

        const [updatedChannel] = await db
            .update(channels)
            .set(updates)
            .where(eq(channels.id, id))
            .returning();

        return NextResponse.json(updatedChannel);
    } catch (error) {
        console.error("Error updating channel:", error);
        return serverError();
    }
}

// DELETE /api/channels/[id] - Archive channel
export async function DELETE(request: Request, { params }: RouteParams) {
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

        if (!canManageChannel(user, channel, membership)) {
            return forbidden();
        }

        // Archive instead of delete
        await db.update(channels).set({ archivedAt: new Date() }).where(eq(channels.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error archiving channel:", error);
        return serverError();
    }
}
