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

// PATCH /api/channels/[id]/transfer - Transfer channel ownership
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id } = await params;

        const body = await request.json();
        const { newOwnerId } = body;

        if (!newOwnerId || typeof newOwnerId !== "string") {
            return badRequest("newOwnerId is required");
        }

        const channel = await db.query.channels.findFirst({
            where: and(eq(channels.id, id), isNull(channels.archivedAt))
        });

        if (!channel) {
            return notFound("Channel");
        }

        // Only the current owner or org owner/admin can transfer ownership
        const isChannelOwner = channel.ownerId === user.id;
        const isOrgAdmin = user.orgRole === "owner" || user.orgRole === "admin";

        if (!isChannelOwner && !isOrgAdmin) {
            return forbidden();
        }

        // Cannot transfer to yourself
        if (newOwnerId === channel.ownerId) {
            return badRequest("New owner must be a different user");
        }

        // Verify new owner is a member of the channel
        const newOwnerMembership = await db.query.channelMembers.findFirst({
            where: and(eq(channelMembers.channelId, id), eq(channelMembers.userId, newOwnerId))
        });

        if (!newOwnerMembership) {
            return badRequest("New owner must be a member of the channel");
        }

        // Transfer ownership: update the channel's ownerId and promote the
        // new owner's channel membership role to "owner"
        await db.transaction(async (tx) => {
            await tx.update(channels).set({ ownerId: newOwnerId }).where(eq(channels.id, id));

            await tx
                .update(channelMembers)
                .set({ role: "owner" })
                .where(
                    and(eq(channelMembers.channelId, id), eq(channelMembers.userId, newOwnerId))
                );

            // Demote the previous owner to "admin" so they retain elevated access
            await tx
                .update(channelMembers)
                .set({ role: "admin" })
                .where(
                    and(
                        eq(channelMembers.channelId, id),
                        eq(channelMembers.userId, channel.ownerId)
                    )
                );
        });

        // Emit channel update event
        emitToChannel(id, "channel:update", {
            id,
            name: channel.name,
            emoji: channel.emoji,
            description: channel.description,
            isPrivate: channel.isPrivate
        });

        return NextResponse.json({
            success: true,
            previousOwnerId: channel.ownerId,
            newOwnerId
        });
    } catch (error) {
        console.error("Error transferring channel ownership:", error);
        return serverError();
    }
}
