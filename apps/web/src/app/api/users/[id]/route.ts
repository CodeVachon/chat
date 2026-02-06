import { db } from "@chat/db";
import { users } from "@chat/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
    badRequest,
    forbidden,
    getAuthenticatedUser,
    notFound,
    serverError,
    unauthorized
} from "@/lib/api-utils";
import { canChangeUserRole, canManageMembers, canRemoveUser } from "@/lib/permissions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get user profile
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return unauthorized();

        const { id } = await params;

        const user = await db.query.users.findFirst({
            where: eq(users.id, id),
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
            }
        });

        if (!user) {
            return notFound("User");
        }

        return NextResponse.json({
            ...user,
            createdAt: user.createdAt.toISOString(),
            lastSeenAt: user.lastSeenAt?.toISOString() || null
        });
    } catch (error) {
        console.error("Error getting user:", error);
        return serverError();
    }
}

// PATCH /api/users/[id] - Update user profile
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return unauthorized();

        const { id } = await params;
        const body = await request.json();

        // Users can only update their own profile (except role changes)
        const isSelf = currentUser.id === id;
        const isAdmin = canManageMembers(currentUser);

        if (!isSelf && !isAdmin) {
            return forbidden();
        }

        const targetUser = await db.query.users.findFirst({
            where: eq(users.id, id)
        });

        if (!targetUser) {
            return notFound("User");
        }

        const updates: Partial<typeof users.$inferInsert> = {};

        // Self-update fields
        if (isSelf) {
            if (body.name !== undefined) {
                if (!body.name || body.name.trim().length === 0) {
                    return badRequest("Name is required");
                }
                updates.name = body.name.trim();
            }
            if (body.image !== undefined) {
                updates.image = body.image || null;
            }
            if (body.status !== undefined) {
                if (!["online", "away", "dnd", "offline"].includes(body.status)) {
                    return badRequest("Invalid status");
                }
                updates.status = body.status;
            }
            if (body.statusMessage !== undefined) {
                updates.statusMessage = body.statusMessage || null;
            }
        }

        // Role change (owner only)
        if (body.orgRole !== undefined && !isSelf) {
            if (!canChangeUserRole(currentUser, targetUser.orgRole, body.orgRole)) {
                return forbidden();
            }
            updates.orgRole = body.orgRole;
        }

        if (Object.keys(updates).length === 0) {
            return badRequest("No valid updates provided");
        }

        updates.updatedAt = new Date();

        const [updatedUser] = await db
            .update(users)
            .set(updates)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                image: users.image,
                orgRole: users.orgRole,
                status: users.status,
                statusMessage: users.statusMessage,
                createdAt: users.createdAt,
                lastSeenAt: users.lastSeenAt
            });

        return NextResponse.json({
            ...updatedUser,
            createdAt: updatedUser.createdAt.toISOString(),
            lastSeenAt: updatedUser.lastSeenAt?.toISOString() || null
        });
    } catch (error) {
        console.error("Error updating user:", error);
        return serverError();
    }
}

// DELETE /api/users/[id] - Remove user from organization
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser) return unauthorized();

        const { id } = await params;

        const targetUser = await db.query.users.findFirst({
            where: eq(users.id, id)
        });

        if (!targetUser) {
            return notFound("User");
        }

        if (!canRemoveUser(currentUser, targetUser)) {
            return forbidden();
        }

        // Delete user (will cascade to sessions, memberships, etc.)
        await db.delete(users).where(eq(users.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error removing user:", error);
        return serverError();
    }
}
