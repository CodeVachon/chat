import { NextResponse } from "next/server";

import { db } from "@/db";

export async function GET() {
    try {
        // Check if organization exists
        const org = await db.query.organization.findFirst();

        // Check if any users exist
        const users = await db.query.users.findMany({ limit: 1 });

        return NextResponse.json({
            organizationExists: !!org,
            organization: org
                ? {
                      name: org.name,
                      slug: org.slug
                  }
                : null,
            setupCompleted: org?.setupCompleted ?? false,
            hasUsers: users.length > 0
        });
    } catch (error) {
        console.error("Error checking setup status:", error);
        return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
    }
}
