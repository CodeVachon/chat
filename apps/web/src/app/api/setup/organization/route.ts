import { db } from "@chat/db";
import { organization } from "@chat/db/schema";
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
        const { name, slug } = body;

        if (!name || !slug) {
            return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
        }

        // Check if organization already exists
        const existing = await db.query.organization.findFirst();
        if (existing) {
            return NextResponse.json({ error: "Organization already exists" }, { status: 400 });
        }

        // Check if slug is taken
        const slugExists = await db.query.organization.findFirst({
            where: eq(organization.slug, slug)
        });
        if (slugExists) {
            return NextResponse.json({ error: "Slug is already taken" }, { status: 400 });
        }

        // Create organization
        const [newOrg] = await db
            .insert(organization)
            .values({
                name,
                slug
            })
            .returning();

        return NextResponse.json(newOrg);
    } catch (error) {
        console.error("Error creating organization:", error);
        return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }
}
