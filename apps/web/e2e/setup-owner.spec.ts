import { expect, test } from "@playwright/test";

import { authenticatedPost, getSetupStatus, signUp } from "./fixtures/auth";

const OWNER_ENDPOINT = "/api/setup/owner";

test.describe("/api/setup/owner", () => {
    test("returns 401 for unauthenticated requests", async ({ request }) => {
        const response = await request.post(OWNER_ENDPOINT, {
            data: { userId: "some-id" }
        });

        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.error).toBe("Unauthorized");
    });

    test("returns 400 when userId is missing", async ({ request }) => {
        const cookie = await signUp(request, {
            email: `owner-noid-${Date.now()}@test.local`,
            password: "testpassword123",
            name: "No ID User"
        });

        const response = await authenticatedPost(request, OWNER_ENDPOINT, cookie, {});

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toBe("User ID is required");
    });

    test("returns 403 when trying to set a different user as owner", async ({ request }) => {
        const cookie = await signUp(request, {
            email: `owner-diff-${Date.now()}@test.local`,
            password: "testpassword123",
            name: "Different User"
        });

        const response = await authenticatedPost(request, OWNER_ENDPOINT, cookie, {
            userId: "some-other-user-id"
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.error).toBe("Forbidden");
    });

    test("allows authenticated user to set themselves as owner when no owner exists", async ({
        request
    }) => {
        const status = await getSetupStatus(request);
        test.skip(status.hasUsers, "Skipped: an owner already exists in the database");

        const email = `owner-self-${Date.now()}@test.local`;
        const cookie = await signUp(request, {
            email,
            password: "testpassword123",
            name: "Owner User"
        });

        const sessionResponse = await request.get("/api/auth/get-session", {
            headers: { cookie }
        });
        expect(sessionResponse.ok()).toBeTruthy();
        const session = await sessionResponse.json();
        const userId = session.user.id;

        const response = await authenticatedPost(request, OWNER_ENDPOINT, cookie, {
            userId
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.orgRole).toBe("owner");
        expect(body.id).toBe(userId);
    });

    test("returns 403 when an owner already exists", async ({ request }) => {
        const status = await getSetupStatus(request);
        test.skip(!status.hasUsers, "Skipped: no owner exists yet to test against");

        const cookie = await signUp(request, {
            email: `owner-dup-${Date.now()}@test.local`,
            password: "testpassword123",
            name: "Second Owner Attempt"
        });

        const sessionResponse = await request.get("/api/auth/get-session", {
            headers: { cookie }
        });
        expect(sessionResponse.ok()).toBeTruthy();
        const session = await sessionResponse.json();
        const userId = session.user.id;

        const response = await authenticatedPost(request, OWNER_ENDPOINT, cookie, {
            userId
        });

        expect(response.status()).toBe(403);
        const body = await response.json();
        expect(body.error).toBe("An owner already exists");
    });
});
