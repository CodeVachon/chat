import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanupExpired() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    for (const [key, entry] of rateLimitStore) {
        if (now > entry.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Get the client identifier (IP address) from request headers.
 */
async function getClientId(): Promise<string> {
    const hdrs = await headers();
    return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
}

/**
 * Check rate limit for a given key prefix and client.
 * Returns { allowed, retryAfterMs } where retryAfterMs is set when rate limited.
 */
export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): { allowed: boolean; retryAfterMs: number } {
    cleanupExpired();

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterMs: 0 };
    }

    entry.count++;
    if (entry.count <= limit) {
        return { allowed: true, retryAfterMs: 0 };
    }

    return { allowed: false, retryAfterMs: entry.resetAt - now };
}

/**
 * Rate limit middleware for API routes.
 * Returns a NextResponse with 429 status if rate limited, or null if allowed.
 *
 * @param routePrefix - A unique prefix for this route (e.g. "channel-messages")
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export async function rateLimit(
    routePrefix: string,
    limit: number,
    windowMs: number
): Promise<NextResponse | null> {
    const clientId = await getClientId();
    const key = `${routePrefix}:${clientId}`;
    const { allowed, retryAfterMs } = checkRateLimit(key, limit, windowMs);

    if (!allowed) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.ceil(retryAfterMs / 1000))
                }
            }
        );
    }

    return null;
}

/**
 * Stricter rate limit for unauthenticated endpoints.
 */
export async function rateLimitPublic(routePrefix: string): Promise<NextResponse | null> {
    return rateLimit(routePrefix, 5, 60_000); // 5 requests per minute
}

// Export for testing
export { rateLimitStore };
