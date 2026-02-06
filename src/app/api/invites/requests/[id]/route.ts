import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { joinRequests } from "@/db/schema";
import {
    badRequest,
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

// PATCH /api/invites/requests/[id] - Approve or reject join request
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        if (!canManageMembers(user)) {
            return forbidden();
        }

        const { id } = await params;

        const body = await request.json();
        const { status } = body;

        if (!status || !["approved", "rejected"].includes(status)) {
            return badRequest('Status must be "approved" or "rejected"');
        }

        const joinRequest = await db.query.joinRequests.findFirst({
            where: eq(joinRequests.id, id)
        });

        if (!joinRequest) {
            return notFound("Join request");
        }

        if (joinRequest.status !== "pending") {
            return badRequest("Join request has already been processed");
        }

        const [updated] = await db
            .update(joinRequests)
            .set({
                status,
                reviewedBy: user.id
            })
            .where(eq(joinRequests.id, id))
            .returning();

        // TODO: If approved, send email invite or create user account

        return NextResponse.json({
            ...updated,
            createdAt: updated.createdAt.toISOString()
        });
    } catch (error) {
        console.error("Error processing join request:", error);
        return serverError();
    }
}
