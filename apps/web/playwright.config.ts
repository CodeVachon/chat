import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : 1,
    reporter: process.env.CI ? "github" : "html",
    use: {
        baseURL: "http://localhost:3367",
        extraHTTPHeaders: {
            "Content-Type": "application/json"
        },
        trace: "on-first-retry",
        screenshot: "only-on-failure"
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        }
    ]
    // webServer disabled since dev server should be running
    // webServer: {
    //     command: "bun run dev",
    //     url: "http://localhost:3367",
    //     reuseExistingServer: !process.env.CI,
    //     timeout: 120 * 1000
    // }
});
