import { APIRequestContext } from "@playwright/test";

interface SignUpOptions {
    email: string;
    password: string;
    name: string;
}

/**
 * Signs up a user via BetterAuth and returns the session cookie header.
 */
export async function signUp(request: APIRequestContext, options: SignUpOptions): Promise<string> {
    const response = await request.post("/api/auth/sign-up/email", {
        data: {
            email: options.email,
            password: options.password,
            name: options.name
        }
    });

    if (!response.ok()) {
        const body = await response.text();
        throw new Error(`Sign-up failed (${response.status()}): ${body}`);
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

/**
 * Makes an authenticated API request using session cookies.
 */
export async function authenticatedPost(
    request: APIRequestContext,
    url: string,
    cookie: string,
    data?: Record<string, unknown>
) {
    return request.post(url, {
        data,
        headers: {
            cookie
        }
    });
}

interface SetupStatus {
    organizationExists: boolean;
    hasUsers: boolean;
    setupCompleted: boolean;
}

/**
 * Returns the current setup status from the API.
 */
export async function getSetupStatus(request: APIRequestContext): Promise<SetupStatus> {
    const response = await request.get("/api/setup/status");
    return response.json();
}
