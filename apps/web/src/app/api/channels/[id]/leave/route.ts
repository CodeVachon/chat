import { db } from "@chat/db";
import { channelMembers, channels } from "@chat/db/schema";
import { emitToChannel } from "@chat/events/publisher";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
    badRequest,
    getAuthenticatedUser,
    notFound,
    serverError,
    unauthorized
} from "@/lib/api-utils";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/channels/[id]/leave - Leave a channel
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

        // Check if a member
        const membership = await db.query.channelMembers.findFirst({
            where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, user.id))
        });

        if (!membership) {
            return badRequest("Not a member of this channel");
        }

        // Channel owner cannot leave (must transfer ownership first)
        if (channel.ownerId === user.id) {
            return badRequest("Channel owner cannot leave. Transfer ownership first.");
        }

        await db
            .delete(channelMembers)
            .where(and(eq(channelMembers.channelId, id), eq(channelMembers.userId, user.id)));

        // Emit member leave event
        emitToChannel(id, "member:leave", {
            channelId: id,
            userId: user.id,
            userName: user.name,
            role: membership.role
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error leaving channel:", error);
        return serverError();
    }
}
