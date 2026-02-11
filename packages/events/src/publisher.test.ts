import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Track event handlers registered via .on()
const mockOn = vi.fn();
const mockPublish = vi.fn().mockResolvedValue(0);
const MockRedisConstructor = vi.fn();

vi.mock("ioredis", () => {
    // Must use a function declaration (not arrow) so it can be called with `new`
    const MockRedis = function (this: Record<string, unknown>, ...args: unknown[]) {
        MockRedisConstructor(...args);
        this.on = mockOn;
        this.publish = mockPublish;
    } as unknown;
    return { default: MockRedis };
});

// Because publisher.ts uses a module-level singleton, we need to re-import
// a fresh module for each test to reset the `redis` variable.
async function importFreshPublisher() {
    return await import("./publisher.js");
}

describe("publisher", () => {
    const originalEnv = process.env.REDIS_URL;

    beforeEach(async () => {
        vi.resetModules();
        MockRedisConstructor.mockClear();
        mockOn.mockClear();
        mockPublish.mockClear().mockResolvedValue(0);
        process.env.REDIS_URL = "redis://localhost:6379";
    });

    afterEach(() => {
        if (originalEnv !== undefined) {
            process.env.REDIS_URL = originalEnv;
        } else {
            delete process.env.REDIS_URL;
        }
    });

    describe("getRedis", () => {
        it("throws when REDIS_URL is missing", async () => {
            delete process.env.REDIS_URL;
            const { emitToChannel } = await importFreshPublisher();

            expect(() => emitToChannel("ch1", "message:new", {})).toThrowError(
                "REDIS_URL environment variable is required"
            );
        });

        it("creates a Redis client with the correct URL", async () => {
            const { emitToChannel } = await importFreshPublisher();

            emitToChannel("ch1", "message:new", {});

            expect(MockRedisConstructor).toHaveBeenCalledWith("redis://localhost:6379");
        });

        it("returns the same singleton instance on repeated calls", async () => {
            const { emitToChannel, emitToUser } = await importFreshPublisher();

            emitToChannel("ch1", "message:new", {});
            emitToUser("u1", "message:new", {});

            expect(MockRedisConstructor).toHaveBeenCalledTimes(1);
        });

        it("attaches an error handler to the Redis client", async () => {
            const { emitToChannel } = await importFreshPublisher();

            emitToChannel("ch1", "message:new", {});

            expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
        });
    });

    describe("publish", () => {
        it("catches and logs publish failures without throwing", async () => {
            const publishError = new Error("connection lost");
            mockPublish.mockRejectedValueOnce(publishError);
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            const { emitToChannel } = await importFreshPublisher();
            emitToChannel("ch1", "message:new", { id: "1" });

            // Wait for the .catch() handler to fire
            await vi.waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith("Redis publish error:", publishError);
            });
        });
    });

    describe("room prefix formatting", () => {
        it("emitToChannel prefixes room with 'channel:'", async () => {
            const { emitToChannel } = await importFreshPublisher();

            emitToChannel("abc", "message:new", { id: "1" });

            expect(mockPublish).toHaveBeenCalledWith(
                "socket:events",
                JSON.stringify({ room: "channel:abc", event: "message:new", data: { id: "1" } })
            );
        });

        it("emitToConversation prefixes room with 'conversation:'", async () => {
            const { emitToConversation } = await importFreshPublisher();

            emitToConversation("xyz", "message:new", { id: "2" });

            expect(mockPublish).toHaveBeenCalledWith(
                "socket:events",
                JSON.stringify({
                    room: "conversation:xyz",
                    event: "message:new",
                    data: { id: "2" }
                })
            );
        });

        it("emitToUser prefixes room with 'user:'", async () => {
            const { emitToUser } = await importFreshPublisher();

            emitToUser("u42", "presence:update", { status: "online" });

            expect(mockPublish).toHaveBeenCalledWith(
                "socket:events",
                JSON.stringify({
                    room: "user:u42",
                    event: "presence:update",
                    data: { status: "online" }
                })
            );
        });
    });
});
