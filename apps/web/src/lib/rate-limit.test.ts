import { afterEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, rateLimitStore } from "./rate-limit";

// We test the core checkRateLimit function directly since rateLimit() depends on Next.js headers()
describe("checkRateLimit", () => {
    afterEach(() => {
        rateLimitStore.clear();
    });

    it("allows requests within the limit", () => {
        const result = checkRateLimit("test:client1", 5, 60_000);
        expect(result.allowed).toBe(true);
        expect(result.retryAfterMs).toBe(0);
    });

    it("allows up to the exact limit", () => {
        for (let i = 0; i < 5; i++) {
            const result = checkRateLimit("test:client2", 5, 60_000);
            expect(result.allowed).toBe(true);
        }
    });

    it("rejects requests over the limit", () => {
        for (let i = 0; i < 5; i++) {
            checkRateLimit("test:client3", 5, 60_000);
        }
        const result = checkRateLimit("test:client3", 5, 60_000);
        expect(result.allowed).toBe(false);
        expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("tracks different keys independently", () => {
        for (let i = 0; i < 5; i++) {
            checkRateLimit("route-a:client1", 5, 60_000);
        }
        // route-a is exhausted
        expect(checkRateLimit("route-a:client1", 5, 60_000).allowed).toBe(false);
        // route-b is still available
        expect(checkRateLimit("route-b:client1", 5, 60_000).allowed).toBe(true);
    });

    it("resets after the time window expires", () => {
        vi.useFakeTimers();
        try {
            for (let i = 0; i < 5; i++) {
                checkRateLimit("test:client4", 5, 60_000);
            }
            expect(checkRateLimit("test:client4", 5, 60_000).allowed).toBe(false);

            // Advance past the window
            vi.advanceTimersByTime(60_001);

            expect(checkRateLimit("test:client4", 5, 60_000).allowed).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });

    it("returns correct retryAfterMs", () => {
        vi.useFakeTimers();
        try {
            for (let i = 0; i < 5; i++) {
                checkRateLimit("test:client5", 5, 60_000);
            }
            const result = checkRateLimit("test:client5", 5, 60_000);
            expect(result.allowed).toBe(false);
            // Should be close to 60 seconds
            expect(result.retryAfterMs).toBeGreaterThan(0);
            expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
        } finally {
            vi.useRealTimers();
        }
    });

    it("cleans up expired entries when store is checked after window expires", () => {
        // Add an entry with a very short window
        checkRateLimit("test:old", 5, 1_000);
        expect(rateLimitStore.size).toBe(1);

        // Manually expire the entry by setting resetAt to the past
        const entry = rateLimitStore.get("test:old")!;
        entry.resetAt = Date.now() - 1;

        // Force the cleanup by setting a stale lastCleanup time.
        // The module tracks lastCleanup internally, but we can trigger it
        // by adding many entries and waiting. Instead, verify that expired
        // entries get replaced when re-accessed:
        const result = checkRateLimit("test:old", 5, 60_000);
        expect(result.allowed).toBe(true);
        // The old entry was expired and replaced with a fresh window
        expect(rateLimitStore.get("test:old")!.count).toBe(1);
    });
});
