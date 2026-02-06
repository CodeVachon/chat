import { and, eq, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { channelMembers, channels } from "@/db/schema";
import {
    badRequest,
    forbidden,
    getAuthenticatedUser,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canCreateChannels, canViewAllChannels } from "@/lib/permissions";

// GET /api/channels - List accessible channels
export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        let channelList;

        if (canViewAllChannels(user)) {
            // Admins and owners can see all channels
            channelList = await db.query.channels.findMany({
                where: isNull(channels.archivedAt),
                orderBy: (channels, { asc }) => [asc(channels.name)]
            });
        } else {
            // Regular members can only see public channels and channels they're a member of
            const memberChannels = await db.query.channelMembers.findMany({
                where: eq(channelMembers.userId, user.id),
                columns: { channelId: true }
            });

            const memberChannelIds = memberChannels.map((m) => m.channelId);

            channelList = await db.query.channels.findMany({
                where: and(
                    isNull(channels.archivedAt),
                    or(
                        eq(channels.isPrivate, false),
                        memberChannelIds.length > 0
                            ? or(...memberChannelIds.map((id) => eq(channels.id, id)))
                            : undefined
                    )
                ),
                orderBy: (channels, { asc }) => [asc(channels.name)]
            });
        }

        return NextResponse.json(channelList);
    } catch (error) {
        console.error("Error listing channels:", error);
        return serverError();
    }
}

// POST /api/channels - Create a new channel
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        if (!canCreateChannels(user)) {
            return forbidden();
        }

        const body = await request.json();
        const { name, emoji, description, isPrivate = false } = body;

        if (!name || name.trim().length === 0) {
            return badRequest("Channel name is required");
        }

        if (name.length > 80) {
            return badRequest("Channel name must be 80 characters or less");
        }

        // Check for duplicate name
        const existing = await db.query.channels.findFirst({
            where: and(eq(channels.name, name.trim()), isNull(channels.archivedAt))
        });

        if (existing) {
            return badRequest("A channel with this name already exists");
        }

        // Create channel
        const [newChannel] = await db
            .insert(channels)
            .values({
                name: name.trim(),
                emoji: emoji || null,
                description: description || null,
                isPrivate,
                ownerId: user.id
            })
            .returning();

        // Add creator as channel owner
        await db.insert(channelMembers).values({
            channelId: newChannel.id,
            userId: user.id,
            role: "owner"
        });

        return NextResponse.json(newChannel, { status: 201 });
    } catch (error) {
        console.error("Error creating channel:", error);
        return serverError();
    }
}
