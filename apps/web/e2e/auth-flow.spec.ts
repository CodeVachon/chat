import { expect, test } from "@playwright/test";

import { APIHelper } from "./helpers";

test.describe("Authentication Flow", () => {
    let apiHelper: APIHelper;

    test.beforeEach(async ({ request }) => {
        apiHelper = new APIHelper(request);
    });

    test("should create a new user account", async () => {
        const email = `test-user-${Date.now()}@example.com`;
        const password = "testpassword123";
        const name = "Test User";

        const cookie = await apiHelper.createTestUser(email, password, name);
        expect(cookie).toContain("session_token=");

        const session = await apiHelper.getSession(cookie);
        expect(session.user.email).toBe(email);
        expect(session.user.name).toBe(name);
    });

    test("should prevent duplicate user creation", async ({ request }) => {
        const email = `duplicate-test-${Date.now()}@example.com`;

        // Create first user
        await apiHelper.createTestUser(email);

        // Try to create same user again
        const response = await request.post("/api/auth/sign-up/email", {
            data: {
                email,
                password: "testpassword123",
                name: "Test User"
            }
        });

        expect(response.status()).toBeGreaterThanOrEqual(400);
    });
});

test.describe("Organization Setup", () => {
    test("should return current setup status", async ({ request }) => {
        const apiHelper = new APIHelper(request);
        const status = await apiHelper.getSetupStatus();

        expect(status).toHaveProperty("organizationExists");
        expect(status).toHaveProperty("hasUsers");
        expect(status).toHaveProperty("setupCompleted");
        expect(typeof status.organizationExists).toBe("boolean");
        expect(typeof status.hasUsers).toBe("boolean");
        expect(typeof status.setupCompleted).toBe("boolean");
    });

    test("should require authentication for setup operations", async ({ request }) => {
        const response = await request.post("/api/setup/organization", {
            data: { name: "Test Org", slug: "test-org" }
        });

        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body).toHaveProperty("error");
        expect(body.error).toContain("Unauthorized");
    });
});
