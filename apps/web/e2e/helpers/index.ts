import { APIRequestContext, expect, Page } from "@playwright/test";

export class APIHelper {
    constructor(private request: APIRequestContext) {}

    async getSetupStatus() {
        const response = await this.request.get("/api/setup/status");
        expect(response.ok()).toBeTruthy();
        return response.json();
    }

    async createTestUser(email: string, password: string = "testpassword123", name?: string) {
        const response = await this.request.post("/api/auth/sign-up/email", {
            data: {
                email,
                password,
                name: name || email.split("@")[0]
            }
        });

        if (!response.ok()) {
            throw new Error(`Failed to create user: ${response.status()}`);
        }

        const setCookieHeaders = response
            .headersArray()
            .filter((h) => h.name.toLowerCase() === "set-cookie");

        const cookies = setCookieHeaders.map((h) => {
            const cookiePart = h.value.split(";")[0];
            return cookiePart;
        });

        return cookies.join("; ");
    }

    async getSession(cookie: string) {
        const response = await this.request.get("/api/auth/get-session", {
            headers: { cookie }
        });

        if (!response.ok()) {
            throw new Error(`Failed to get session: ${response.status()}`);
        }

        return response.json();
    }
}

export class PageHelper {
    constructor(private page: Page) {}

    async waitForAPIResponse(url: string | RegExp, timeout = 10000) {
        return this.page.waitForResponse(
            (response) => {
                return typeof url === "string"
                    ? response.url().includes(url)
                    : url.test(response.url());
            },
            { timeout }
        );
    }

    async navigateWithWait(path: string) {
        const responsePromise = this.page.waitForResponse("**/*");
        await this.page.goto(path);
        return responsePromise;
    }
}
