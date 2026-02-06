import { db } from "@chat/db";
import { inviteLinks } from "@chat/db/schema";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { forbidden, getAuthenticatedUser, serverError, unauthorized } from "@/lib/api-utils";
import { canManageMembers } from "@/lib/permissions";

// GET /api/invites/link - List active invite links
export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        if (!canManageMembers(user)) {
            return forbidden();
        }

        const links = await db.query.inviteLinks.findMany({
            where: and(
                eq(inviteLinks.isActive, true),
                or(isNull(inviteLinks.expiresAt), gt(inviteLinks.expiresAt, new Date()))
            ),
            with: {
                createdByUser: {
                    columns: { id: true, name: true }
                }
            },
            orderBy: (links, { desc }) => [desc(links.createdAt)]
        });

        return NextResponse.json(
            links.map((link) => ({
                ...link,
                url: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${link.code}`,
                createdAt: link.createdAt.toISOString(),
                expiresAt: link.expiresAt?.toISOString() || null
            }))
        );
    } catch (error) {
        console.error("Error listing invite links:", error);
        return serverError();
    }
}

// POST /api/invites/link - Generate invite link
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        if (!canManageMembers(user)) {
            return forbidden();
        }

        const body = await request.json();
        const { expiresIn, maxUses } = body;

        // Generate unique code
        const code = nanoid(10);

        // Calculate expiry
        let expiresAt: Date | null = null;
        if (expiresIn && typeof expiresIn === "number") {
            expiresAt = new Date(Date.now() + expiresIn);
        }

        const [newLink] = await db
            .insert(inviteLinks)
            .values({
                code,
                createdBy: user.id,
                expiresAt,
                maxUses: maxUses || null
            })
            .returning();

        return NextResponse.json(
            {
                ...newLink,
                url: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${newLink.code}`,
                createdAt: newLink.createdAt.toISOString(),
                expiresAt: newLink.expiresAt?.toISOString() || null
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating invite link:", error);
        return serverError();
    }
}
