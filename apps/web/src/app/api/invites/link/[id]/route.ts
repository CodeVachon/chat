import { db } from "@chat/db";
import { inviteLinks } from "@chat/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
    forbidden,
    getAuthenticatedUser,
    notFound,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canManageMembers } from "@/lib/permissions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// DELETE /api/invites/link/[id] - Revoke invite link
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        if (!canManageMembers(user)) {
            return forbidden();
        }

        const { id } = await params;

        const link = await db.query.inviteLinks.findFirst({
            where: eq(inviteLinks.id, id)
        });

        if (!link) {
            return notFound("Invite link");
        }

        await db.update(inviteLinks).set({ isActive: false }).where(eq(inviteLinks.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error revoking invite link:", error);
        return serverError();
    }
}
