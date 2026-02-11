import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupSocket, isSocketEventAllowed, rateLimitStore } from "./rate-limit";

describe("isSocketEventAllowed", () => {
    afterEach(() => {
        rateLimitStore.clear();
    });

    it("allows events within the limit", () => {
        expect(isSocketEventAllowed("socket1", "typing:start", 5, 10_000)).toBe(true);
    });

    it("allows up to the exact limit", () => {
        for (let i = 0; i < 5; i++) {
            expect(isSocketEventAllowed("socket1", "typing:start", 5, 10_000)).toBe(true);
        }
    });

    it("blocks events over the limit", () => {
        for (let i = 0; i < 5; i++) {
            isSocketEventAllowed("socket2", "typing:start", 5, 10_000);
        }
        expect(isSocketEventAllowed("socket2", "typing:start", 5, 10_000)).toBe(false);
    });

    it("tracks different sockets independently", () => {
        for (let i = 0; i < 5; i++) {
            isSocketEventAllowed("socket-a", "typing:start", 5, 10_000);
        }
        expect(isSocketEventAllowed("socket-a", "typing:start", 5, 10_000)).toBe(false);
        expect(isSocketEventAllowed("socket-b", "typing:start", 5, 10_000)).toBe(true);
    });

    it("tracks different events independently", () => {
        for (let i = 0; i < 5; i++) {
            isSocketEventAllowed("socket1", "typing:start", 5, 10_000);
        }
        expect(isSocketEventAllowed("socket1", "typing:start", 5, 10_000)).toBe(false);
        expect(isSocketEventAllowed("socket1", "join:channel", 5, 10_000)).toBe(true);
    });

    it("resets after the time window", () => {
        vi.useFakeTimers();
        try {
            for (let i = 0; i < 5; i++) {
                isSocketEventAllowed("socket3", "typing:start", 5, 10_000);
            }
            expect(isSocketEventAllowed("socket3", "typing:start", 5, 10_000)).toBe(false);

            vi.advanceTimersByTime(10_001);

            expect(isSocketEventAllowed("socket3", "typing:start", 5, 10_000)).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe("cleanupSocket", () => {
    afterEach(() => {
        rateLimitStore.clear();
    });

    it("removes all entries for a disconnected socket", () => {
        isSocketEventAllowed("socket-x", "typing:start", 5, 10_000);
        isSocketEventAllowed("socket-x", "join:channel", 5, 10_000);
        isSocketEventAllowed("socket-y", "typing:start", 5, 10_000);

        expect(rateLimitStore.size).toBe(3);

        cleanupSocket("socket-x");

        expect(rateLimitStore.size).toBe(1);
        expect(rateLimitStore.has("socket-y:typing:start")).toBe(true);
    });

    it("does nothing for unknown socket", () => {
        isSocketEventAllowed("socket-a", "typing:start", 5, 10_000);
        cleanupSocket("socket-unknown");
        expect(rateLimitStore.size).toBe(1);
    });
});
