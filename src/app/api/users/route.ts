import { NextResponse } from "next/server";

import { db } from "@/db";
import { getAuthenticatedUser, serverError, unauthorized } from "@/lib/api-utils";

// GET /api/users - List organization members
export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const users = await db.query.users.findMany({
            columns: {
                id: true,
                name: true,
                email: true,
                image: true,
                orgRole: true,
                status: true,
                statusMessage: true,
                createdAt: true,
                lastSeenAt: true
            },
            orderBy: (users, { asc }) => [asc(users.name)]
        });

        return NextResponse.json(
            users.map((u) => ({
                ...u,
                createdAt: u.createdAt.toISOString(),
                lastSeenAt: u.lastSeenAt?.toISOString() || null
            }))
        );
    } catch (error) {
        console.error("Error listing users:", error);
        return serverError();
    }
}
