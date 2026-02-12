import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock socket.io-client
vi.mock("socket.io-client", () => ({}));

import { useTyping } from "./use-typing";

function createMockSocket() {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    return {
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event)!.add(handler);
        }),
        off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            listeners.get(event)?.delete(handler);
        }),
        emit: vi.fn(),
        // Helper to simulate incoming events
        _emit(event: string, data: unknown) {
            listeners.get(event)?.forEach((handler) => handler(data));
        },
        _listeners: listeners
    };
}

describe("useTyping", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns empty typing users initially", () => {
        const socket = createMockSocket();
        const { result } = renderHook(() =>
            useTyping({ socket: socket as never, channelId: "ch1" })
        );

        expect(result.current.typingUsers).toEqual([]);
    });

    it("adds typing users on typing:start event", () => {
        const socket = createMockSocket();
        const { result } = renderHook(() =>
            useTyping({ socket: socket as never, channelId: "ch1" })
        );

        act(() => {
            socket._emit("typing:start", {
                userId: "user1",
                userName: "Alice",
                channelId: "ch1"
            });
        });

        expect(result.current.typingUsers).toEqual([{ userId: "user1", userName: "Alice" }]);
    });

    it("removes typing users on typing:stop event", () => {
        const socket = createMockSocket();
        const { result } = renderHook(() =>
            useTyping({ socket: socket as never, channelId: "ch1" })
        );

        act(() => {
            socket._emit("typing:start", {
                userId: "user1",
                userName: "Alice",
                channelId: "ch1"
            });
        });
        expect(result.current.typingUsers).toHaveLength(1);

        act(() => {
            socket._emit("typing:stop", {
                userId: "user1",
                userName: "Alice",
                channelId: "ch1"
            });
        });
        expect(result.current.typingUsers).toEqual([]);
    });

    it("clears typing users when channelId changes", () => {
        const socket = createMockSocket();
        const { result, rerender } = renderHook(
            ({ channelId }) => useTyping({ socket: socket as never, channelId }),
            { initialProps: { channelId: "ch1" } }
        );

        act(() => {
            socket._emit("typing:start", {
                userId: "user1",
                userName: "Alice",
                channelId: "ch1"
            });
        });
        expect(result.current.typingUsers).toHaveLength(1);

        // Change channel
        rerender({ channelId: "ch2" });

        expect(result.current.typingUsers).toEqual([]);
    });

    it("clears typing users when conversationId changes", () => {
        const socket = createMockSocket();
        const { result, rerender } = renderHook(
            ({ conversationId }) => useTyping({ socket: socket as never, conversationId }),
            { initialProps: { conversationId: "conv1" } }
        );

        act(() => {
            socket._emit("typing:start", {
                userId: "user1",
                userName: "Alice",
                conversationId: "conv1"
            });
        });
        expect(result.current.typingUsers).toHaveLength(1);

        rerender({ conversationId: "conv2" });

        expect(result.current.typingUsers).toEqual([]);
    });

    it("auto-removes typing user after 3 second timeout", () => {
        const socket = createMockSocket();
        const { result } = renderHook(() =>
            useTyping({ socket: socket as never, channelId: "ch1" })
        );

        act(() => {
            socket._emit("typing:start", {
                userId: "user1",
                userName: "Alice",
                channelId: "ch1"
            });
        });
        expect(result.current.typingUsers).toHaveLength(1);

        act(() => {
            vi.advanceTimersByTime(3001);
        });
        expect(result.current.typingUsers).toEqual([]);
    });

    it("emits typing:start on startTyping", () => {
        const socket = createMockSocket();
        const { result } = renderHook(() =>
            useTyping({ socket: socket as never, channelId: "ch1" })
        );

        act(() => {
            result.current.startTyping();
        });

        expect(socket.emit).toHaveBeenCalledWith("typing:start", {
            channelId: "ch1",
            conversationId: undefined
        });
    });

    it("emits typing:stop on stopTyping", () => {
        const socket = createMockSocket();
        const { result } = renderHook(() =>
            useTyping({ socket: socket as never, channelId: "ch1" })
        );

        act(() => {
            result.current.startTyping();
        });
        act(() => {
            result.current.stopTyping();
        });

        expect(socket.emit).toHaveBeenCalledWith("typing:stop", {
            channelId: "ch1",
            conversationId: undefined
        });
    });
});
