import { db } from "@chat/db";
import { channelMembers, channels } from "@chat/db/schema";
import { emitToChannel } from "@chat/events/publisher";
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

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST /api/channels/[id]/join - Join a public channel
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

        // Can only self-join public channels
        if (channel.isPrivate) {
            return forbidden();
        }

        // Check if already a member
        const existingMembership = await db.query.channelMembers.findFirst({
            where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, user.id))
        });

        if (existingMembership) {
            return badRequest("Already a member of this channel");
        }

        const [membership] = await db
            .insert(channelMembers)
            .values({
                channelId: id,
                userId: user.id,
                role: "member"
            })
            .returning();

        // Emit member join event
        emitToChannel(id, "member:join", {
            channelId: id,
            userId: user.id,
            userName: user.name,
            role: "member"
        });

        return NextResponse.json(membership, { status: 201 });
    } catch (error) {
        console.error("Error joining channel:", error);
        return serverError();
    }
}
