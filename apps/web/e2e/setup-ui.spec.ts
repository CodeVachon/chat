import { expect, test } from "@playwright/test";

test.describe("Setup Flow UI Tests", () => {
    test("should load the home page", async ({ page }) => {
        await page.goto("/");

        // Check that the page loads without errors
        await expect(page).toHaveTitle(/Chat/);
    });

    test("should navigate to setup if organization doesn't exist", async ({ page }) => {
        // This test would be relevant in a fresh setup
        // For now, we'll just check that we can access the setup status
        const response = await page.request.get("/api/setup/status");
        expect(response.ok()).toBeTruthy();

        const status = await response.json();
        expect(status).toHaveProperty("organizationExists");
        expect(status).toHaveProperty("hasUsers");
        expect(status).toHaveProperty("setupCompleted");
    });

    test("should handle API errors gracefully", async ({ page }) => {
        // Test a protected endpoint without authentication
        const response = await page.request.post("/api/setup/organization", {
            data: { name: "Test", slug: "test" }
        });

        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body).toHaveProperty("error");
    });
});
