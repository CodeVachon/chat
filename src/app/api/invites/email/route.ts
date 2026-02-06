import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { emailInvites } from "@/db/schema";
import {
    badRequest,
    forbidden,
    getAuthenticatedUser,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canManageMembers } from "@/lib/permissions";

// POST /api/invites/email - Send email invites
export async function POST(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        if (!canManageMembers(user)) {
            return forbidden();
        }

        const body = await request.json();
        const { emails } = body;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return badRequest("Emails array is required");
        }

        // Validate emails
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validEmails = emails.filter((email: string) => emailRegex.test(email));

        if (validEmails.length === 0) {
            return badRequest("No valid emails provided");
        }

        // Create invites (expires in 7 days)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const invites = validEmails.map((email: string) => ({
            email,
            invitedBy: user.id,
            token: nanoid(32),
            expiresAt
        }));

        const createdInvites = await db.insert(emailInvites).values(invites).returning();

        // TODO: Send actual emails with SendGrid/Resend/etc.
        // For now, just return the created invites

        return NextResponse.json(
            {
                sent: createdInvites.length,
                invites: createdInvites.map((inv) => ({
                    id: inv.id,
                    email: inv.email,
                    status: inv.status,
                    expiresAt: inv.expiresAt.toISOString()
                }))
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error sending email invites:", error);
        return serverError();
    }
}
