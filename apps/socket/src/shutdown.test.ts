import type { Server as HttpServer } from "http";
import type { Server as IoServer } from "socket.io";
import { describe, expect, it, vi } from "vitest";

import { gracefulShutdown } from "./shutdown";

function createMockQuittable() {
    return { quit: vi.fn().mockResolvedValue("OK") };
}

function createMockIo() {
    return { close: vi.fn() } as unknown as IoServer;
}

function createMockServer() {
    return { close: vi.fn() } as unknown as HttpServer;
}

describe("gracefulShutdown", () => {
    it("quits the Redis subscriber", async () => {
        const redisSubscriber = createMockQuittable();
        await gracefulShutdown({
            redisSubscriber,
            pubClient: createMockQuittable(),
            subClient: createMockQuittable(),
            io: createMockIo(),
            server: createMockServer()
        });
        expect(redisSubscriber.quit).toHaveBeenCalledTimes(1);
    });

    it("quits the pub and sub Redis clients", async () => {
        const pubClient = createMockQuittable();
        const subClient = createMockQuittable();
        await gracefulShutdown({
            redisSubscriber: createMockQuittable(),
            pubClient,
            subClient,
            io: createMockIo(),
            server: createMockServer()
        });
        expect(pubClient.quit).toHaveBeenCalledTimes(1);
        expect(subClient.quit).toHaveBeenCalledTimes(1);
    });

    it("closes the Socket.io server", async () => {
        const io = createMockIo();
        await gracefulShutdown({
            redisSubscriber: createMockQuittable(),
            pubClient: createMockQuittable(),
            subClient: createMockQuittable(),
            io,
            server: createMockServer()
        });
        expect(io.close).toHaveBeenCalledTimes(1);
    });

    it("closes the HTTP server", async () => {
        const server = createMockServer();
        await gracefulShutdown({
            redisSubscriber: createMockQuittable(),
            pubClient: createMockQuittable(),
            subClient: createMockQuittable(),
            io: createMockIo(),
            server
        });
        expect(server.close).toHaveBeenCalledTimes(1);
    });

    it("handles null redisSubscriber gracefully", async () => {
        await expect(
            gracefulShutdown({
                redisSubscriber: null,
                pubClient: createMockQuittable(),
                subClient: createMockQuittable(),
                io: createMockIo(),
                server: createMockServer()
            })
        ).resolves.not.toThrow();
    });

    it("handles null pubClient and subClient gracefully", async () => {
        await expect(
            gracefulShutdown({
                redisSubscriber: createMockQuittable(),
                pubClient: null,
                subClient: null,
                io: createMockIo(),
                server: createMockServer()
            })
        ).resolves.not.toThrow();
    });

    it("handles all null Redis connections (no Redis configured)", async () => {
        const io = createMockIo();
        const server = createMockServer();
        await gracefulShutdown({
            redisSubscriber: null,
            pubClient: null,
            subClient: null,
            io,
            server
        });
        expect(io.close).toHaveBeenCalledTimes(1);
        expect(server.close).toHaveBeenCalledTimes(1);
    });
});
