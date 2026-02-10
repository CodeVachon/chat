import { expect, test } from "@playwright/test";

import { authenticatedPost, getSetupStatus, signUp } from "./fixtures/auth";

const ORG_ENDPOINT = "/api/setup/organization";

test.describe("/api/setup/organization", () => {
    test("returns 401 for unauthenticated requests", async ({ request }) => {
        const response = await request.post(ORG_ENDPOINT, {
            data: { name: "Test Org", slug: "test-org" }
        });

        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.error).toBe("Unauthorized");
    });

    test("returns 400 when name or slug is missing", async ({ request }) => {
        const cookie = await signUp(request, {
            email: `org-noslug-${Date.now()}@test.local`,
            password: "testpassword123",
            name: "No Slug User"
        });

        const response = await authenticatedPost(request, ORG_ENDPOINT, cookie, {
            name: "Test Org"
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toBe("Name and slug are required");
    });

    test("allows authenticated user to create an organization when none exists", async ({
        request
    }) => {
        const status = await getSetupStatus(request);
        test.skip(
            status.organizationExists,
            "Skipped: an organization already exists in the database"
        );

        const slug = `test-org-${Date.now()}`;
        const cookie = await signUp(request, {
            email: `org-create-${Date.now()}@test.local`,
            password: "testpassword123",
            name: "Org Creator"
        });

        const response = await authenticatedPost(request, ORG_ENDPOINT, cookie, {
            name: "Test Organization",
            slug
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.name).toBe("Test Organization");
        expect(body.slug).toBe(slug);
        expect(body.id).toBeDefined();
    });

    test("returns 400 when organization already exists", async ({ request }) => {
        const status = await getSetupStatus(request);
        test.skip(
            !status.organizationExists,
            "Skipped: no organization exists yet to test against"
        );

        const cookie = await signUp(request, {
            email: `org-dup-${Date.now()}@test.local`,
            password: "testpassword123",
            name: "Duplicate Org User"
        });

        const response = await authenticatedPost(request, ORG_ENDPOINT, cookie, {
            name: "Another Org",
            slug: `another-org-${Date.now()}`
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toBe("Organization already exists");
    });
});
