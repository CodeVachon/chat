import { db } from "@chat/db";
import { userPreferences } from "@chat/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { badRequest, getAuthenticatedUser, serverError, unauthorized } from "@/lib/api-utils";

const preferencesSchema = z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    primaryColor: z
        .string()
        .regex(/^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+\s*\)$/, "Invalid OKLCH color format")
        .optional(),
    dateFormat: z
        .enum(["relative", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "MMM d, yyyy"])
        .optional(),
    timeFormat: z.enum(["12h", "24h"]).optional()
});

const defaults = {
    theme: "system" as const,
    primaryColor: "oklch(0.61 0.11 222)",
    dateFormat: "relative" as const,
    timeFormat: "12h" as const
};

// GET /api/preferences
export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const prefs = await db.query.userPreferences.findFirst({
            where: eq(userPreferences.userId, user.id)
        });

        if (!prefs) {
            return NextResponse.json({ userId: user.id, ...defaults });
        }

        return NextResponse.json(prefs);
    } catch (error) {
        console.error("Error getting preferences:", error);
        return serverError();
    }
}

// PATCH /api/preferences
export async function PATCH(request: Request) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return unauthorized();

        const body = await request.json();
        const result = preferencesSchema.safeParse(body);

        if (!result.success) {
            return badRequest(result.error.issues[0]?.message || "Invalid input");
        }

        const updates = result.data;
        if (Object.keys(updates).length === 0) {
            return badRequest("No valid updates provided");
        }

        const [upserted] = await db
            .insert(userPreferences)
            .values({
                userId: user.id,
                ...updates
            })
            .onConflictDoUpdate({
                target: userPreferences.userId,
                set: {
                    ...updates,
                    updatedAt: new Date()
                }
            })
            .returning();

        return NextResponse.json(upserted);
    } catch (error) {
        console.error("Error updating preferences:", error);
        return serverError();
    }
}
