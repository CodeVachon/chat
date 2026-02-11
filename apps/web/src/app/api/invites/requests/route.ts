import { db } from "@chat/db";
import { joinRequests } from "@chat/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
    badRequest,
    forbidden,
    getAuthenticatedUser,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canManageMembers } from "@/lib/permissions";
import { rateLimitPublic } from "@/lib/rate-limit";

// GET /api/invites/requests - List join requests
export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        if (!canManageMembers(user)) {
            return forbidden();
        }

        const requests = await db.query.joinRequests.findMany({
            where: eq(joinRequests.status, "pending"),
            orderBy: (requests, { desc }) => [desc(requests.createdAt)]
        });

        return NextResponse.json(
            requests.map((req) => ({
                ...req,
                createdAt: req.createdAt.toISOString()
            }))
        );
    } catch (error) {
        console.error("Error listing join requests:", error);
        return serverError();
    }
}

// POST /api/invites/requests - Submit join request (public)
export async function POST(request: Request) {
    try {
        // Stricter rate limit for unauthenticated endpoint: 5 per minute
        const rateLimited = await rateLimitPublic("join-requests");
        if (rateLimited) return rateLimited;

        const body = await request.json();
        const { email, name, message } = body;

        if (!email || !name) {
            return badRequest("Email and name are required");
        }

        // Check for existing pending request
        const existing = await db.query.joinRequests.findFirst({
            where: eq(joinRequests.email, email)
        });

        if (existing && existing.status === "pending") {
            return badRequest("A request with this email is already pending");
        }

        const [newRequest] = await db
            .insert(joinRequests)
            .values({
                email,
                name,
                message: message || null
            })
            .returning();

        return NextResponse.json(
            {
                id: newRequest.id,
                status: newRequest.status,
                createdAt: newRequest.createdAt.toISOString()
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating join request:", error);
        return serverError();
    }
}
