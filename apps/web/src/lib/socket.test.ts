import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Track calls to socket.on/off/disconnect/removeAllListeners
const mockOn = vi.fn();
const mockDisconnect = vi.fn();
const mockRemoveAllListeners = vi.fn();
const mockIo = vi.fn();

vi.mock("socket.io-client", () => ({
    io: (...args: unknown[]) => {
        mockIo(...args);
        return {
            on: mockOn,
            off: vi.fn(),
            disconnect: mockDisconnect,
            removeAllListeners: mockRemoveAllListeners,
            io: { opts: {} }
        };
    }
}));

/** Import a fresh module each test to reset singleton state */
async function importFreshSocket() {
    return await import("./socket.js");
}

describe("socket.ts", () => {
    beforeEach(() => {
        vi.resetModules();
        mockOn.mockClear();
        mockIo.mockClear();
        mockDisconnect.mockClear();
        mockRemoveAllListeners.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("getSocket", () => {
        it("creates a socket on first call", async () => {
            const { getSocket } = await importFreshSocket();

            getSocket();

            expect(mockIo).toHaveBeenCalledTimes(1);
        });

        it("returns the same socket instance on subsequent calls", async () => {
            const { getSocket } = await importFreshSocket();

            const s1 = getSocket();
            const s2 = getSocket();

            expect(s1).toBe(s2);
            expect(mockIo).toHaveBeenCalledTimes(1);
        });

        it("registers global listeners exactly once", async () => {
            const { getSocket } = await importFreshSocket();

            getSocket();
            getSocket();
            getSocket();

            // Should have connect, disconnect, connect_error, error = 4 listeners
            expect(mockOn).toHaveBeenCalledTimes(4);
            expect(mockOn).toHaveBeenCalledWith("connect", expect.any(Function));
            expect(mockOn).toHaveBeenCalledWith("disconnect", expect.any(Function));
            expect(mockOn).toHaveBeenCalledWith("connect_error", expect.any(Function));
            expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
        });
    });

    describe("disconnectSocket", () => {
        it("removes all listeners and disconnects", async () => {
            const { getSocket, disconnectSocket } = await importFreshSocket();

            getSocket();
            disconnectSocket();

            expect(mockRemoveAllListeners).toHaveBeenCalledTimes(1);
            expect(mockDisconnect).toHaveBeenCalledTimes(1);
        });

        it("allows a new socket to be created after disconnect", async () => {
            const { getSocket, disconnectSocket } = await importFreshSocket();

            getSocket();
            disconnectSocket();
            getSocket();

            // io() should have been called twice — once initially, once after disconnect
            expect(mockIo).toHaveBeenCalledTimes(2);
        });

        it("re-registers listeners after disconnect + reconnect cycle", async () => {
            const { getSocket, disconnectSocket } = await importFreshSocket();

            getSocket();
            expect(mockOn).toHaveBeenCalledTimes(4);

            disconnectSocket();
            mockOn.mockClear();

            getSocket();
            // Listeners should be registered again on the new socket
            expect(mockOn).toHaveBeenCalledTimes(4);
        });

        it("is safe to call when no socket exists", async () => {
            const { disconnectSocket } = await importFreshSocket();

            // Should not throw
            expect(() => disconnectSocket()).not.toThrow();
            expect(mockDisconnect).not.toHaveBeenCalled();
        });
    });
});
