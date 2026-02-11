import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture event handlers so we can invoke them in tests
type Handler = (...args: unknown[]) => void;
const handlers = new Map<string, Handler>();
const mockSubscribe = vi.fn();
const mockOn = vi.fn((event: string, handler: Handler) => {
    handlers.set(event, handler);
});

vi.mock("ioredis", () => {
    const MockRedis = function (this: Record<string, unknown>) {
        this.subscribe = mockSubscribe;
        this.on = mockOn;
    } as unknown;
    return { default: MockRedis };
});

// Mock Socket.io Server: io.to(room).emit(event, data)
function createMockIo() {
    const mockEmit = vi.fn();
    const mockTo = vi.fn(() => ({ emit: mockEmit }));
    return { to: mockTo, emit: mockEmit };
}

describe("subscriber", () => {
    beforeEach(() => {
        handlers.clear();
        mockSubscribe.mockClear();
        mockOn.mockClear();
    });

    it("subscribes to the 'socket:events' channel", async () => {
        const { subscribeToEvents } = await import("./subscriber.js");
        const io = createMockIo();

        subscribeToEvents(io as never, "redis://localhost:6379");

        expect(mockSubscribe).toHaveBeenCalledWith("socket:events");
    });

    it("attaches an error handler to the Redis client", async () => {
        const { subscribeToEvents } = await import("./subscriber.js");
        const io = createMockIo();

        subscribeToEvents(io as never, "redis://localhost:6379");

        expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("routes valid messages to the correct Socket.io room", async () => {
        const { subscribeToEvents } = await import("./subscriber.js");
        const io = createMockIo();

        subscribeToEvents(io as never, "redis://localhost:6379");

        const messageHandler = handlers.get("message");
        expect(messageHandler).toBeDefined();

        const payload = { room: "channel:general", event: "message:new", data: { id: "msg1" } };
        messageHandler!("socket:events", JSON.stringify(payload));

        expect(io.to).toHaveBeenCalledWith("channel:general");
        expect(io.emit).toHaveBeenCalledWith("message:new", { id: "msg1" });
    });

    it("logs an error on malformed JSON instead of crashing", async () => {
        const { subscribeToEvents } = await import("./subscriber.js");
        const io = createMockIo();
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        subscribeToEvents(io as never, "redis://localhost:6379");

        const messageHandler = handlers.get("message");
        expect(messageHandler).toBeDefined();

        // This should NOT throw
        expect(() => messageHandler!("socket:events", "not valid json")).not.toThrow();

        expect(consoleSpy).toHaveBeenCalledWith(
            "Error processing Redis message:",
            expect.any(SyntaxError)
        );

        // Verify io.to was never called for the malformed message
        expect(io.to).not.toHaveBeenCalled();
    });
});
