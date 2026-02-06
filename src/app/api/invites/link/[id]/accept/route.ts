import { and, eq, gt, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { channelMembers, channels, inviteLinks, users } from "@/db/schema";
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

// POST /api/invites/link/[id]/accept - Accept an invite link
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const { id: code } = await params;

        // Find the invite link by code
        const link = await db.query.inviteLinks.findFirst({
            where: and(
                eq(inviteLinks.code, code),
                eq(inviteLinks.isActive, true),
                or(isNull(inviteLinks.expiresAt), gt(inviteLinks.expiresAt, new Date()))
            )
        });

        if (!link) {
            return notFound("Invite link");
        }

        // Check max uses
        if (link.maxUses && link.useCount >= link.maxUses) {
            return badRequest("This invite link has reached its maximum uses");
        }

        // Check if user is already a member
        const existingUser = await db.query.users.findFirst({
            where: eq(users.id, user.id)
        });

        if (!existingUser) {
            return notFound("User");
        }

        // Update link use count
        await db
            .update(inviteLinks)
            .set({ useCount: link.useCount + 1 })
            .where(eq(inviteLinks.id, link.id));

        // Add user to Town Hall channel if it exists and they're not a member
        const townHall = await db.query.channels.findFirst({
            where: and(eq(channels.name, "Town Hall"), isNull(channels.archivedAt))
        });

        if (townHall) {
            const existingMembership = await db.query.channelMembers.findFirst({
                where: and(
                    eq(channelMembers.channelId, townHall.id),
                    eq(channelMembers.userId, user.id)
                )
            });

            if (!existingMembership) {
                await db.insert(channelMembers).values({
                    channelId: townHall.id,
                    userId: user.id,
                    role: "member"
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error accepting invite:", error);
        return serverError();
    }
}
