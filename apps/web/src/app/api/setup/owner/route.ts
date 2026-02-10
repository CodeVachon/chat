import { db } from "@chat/db";
import { users } from "@chat/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        // Authenticate the request
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Only allow setting yourself as owner
        if (userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Prevent escalation if an owner already exists
        const existingOwner = await db.query.users.findFirst({
            where: eq(users.orgRole, "owner")
        });
        if (existingOwner) {
            return NextResponse.json({ error: "An owner already exists" }, { status: 403 });
        }

        // Update user to be owner
        const [updatedUser] = await db
            .update(users)
            .set({ orgRole: "owner" })
            .where(eq(users.id, userId))
            .returning();

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Error setting up owner:", error);
        return NextResponse.json({ error: "Failed to set up owner" }, { status: 500 });
    }
}
