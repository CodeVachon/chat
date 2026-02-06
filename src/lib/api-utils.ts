import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { auth } from "@/lib/auth";

export async function getAuthenticatedUser() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session?.user) {
        return null;
    }

    // Get full user data with org role
    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, session.user.id)
    });

    return user;
}

export function unauthorized() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound(resource = "Resource") {
    return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message = "Internal server error") {
    return NextResponse.json({ error: message }, { status: 500 });
}
