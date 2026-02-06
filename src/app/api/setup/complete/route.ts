import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { channelMembers, channels, organization } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function POST() {
    try {
        // Get current session
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the organization
        const org = await db.query.organization.findFirst();
        if (!org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Mark setup as complete
        await db
            .update(organization)
            .set({ setupCompleted: true })
            .where(eq(organization.id, org.id));

        // Create Town Hall channel if it doesn't exist
        const existingChannel = await db.query.channels.findFirst({
            where: eq(channels.name, "Town Hall")
        });

        if (!existingChannel) {
            const [townHall] = await db
                .insert(channels)
                .values({
                    name: "Town Hall",
                    emoji: "🏛️",
                    description: "Company-wide announcements and general discussion",
                    isPrivate: false,
                    ownerId: session.user.id
                })
                .returning();

            // Add owner as channel member
            await db.insert(channelMembers).values({
                channelId: townHall.id,
                userId: session.user.id,
                role: "owner"
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error completing setup:", error);
        return NextResponse.json({ error: "Failed to complete setup" }, { status: 500 });
    }
}
