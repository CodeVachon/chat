import { db } from "@chat/db";
import { users } from "@chat/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function GET() {
    try {
        // Get current session (should exist after OAuth)
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            // No session, redirect to login
            redirect("/login");
        }

        // Check if this is the first user (should be owner)
        const existingUsers = await db.query.users.findMany();

        // If this is the first user, make them the owner
        if (existingUsers.length <= 1) {
            await db.update(users).set({ orgRole: "owner" }).where(eq(users.id, session.user.id));
        }

        // Redirect to setup to continue
        redirect("/setup?step=invite");
    } catch (error) {
        console.error("OAuth callback error:", error);
        redirect("/setup?step=owner&error=oauth_failed");
    }
}
