import type { MessagePayload, ReactionPayload } from "@chat/events";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMessages } from "./use-messages";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal Socket mock with on/off/emit */
function createMockSocket() {
    const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

    return {
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            if (!handlers.has(event)) handlers.set(event, new Set());
            handlers.get(event)!.add(handler);
        }),
        off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            handlers.get(event)?.delete(handler);
        }),
        emit: vi.fn(),
        /** Simulate a server-side event arriving at the client */
        __simulateEvent(event: string, data: unknown) {
            handlers.get(event)?.forEach((h) => h(data));
        }
    };
}

function makeMessage(overrides: Partial<MessagePayload> = {}): MessagePayload {
    return {
        id: "msg-1",
        content: "hello",
        channelId: "ch-1",
        conversationId: null,
        authorId: "user-1",
        createdAt: new Date().toISOString(),
        author: { id: "user-1", name: "Alice" },
        reactions: [],
        ...overrides
    };
}

/** Creates a successful fetch Response mock */
function mockFetchResponse(data: unknown) {
    return {
        ok: true,
        json: () => Promise.resolve(data)
    } as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useMessages – reaction race conditions", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // Mock fetch for initial message load
        global.fetch = vi.fn().mockImplementation(() =>
            Promise.resolve(
                mockFetchResponse({
                    messages: [makeMessage()],
                    nextCursor: null
                })
            )
        );
    });

    it("socket reaction:add event adds a reaction to the correct message", async () => {
        const socket = createMockSocket();

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        act(() => {
            socket.__simulateEvent("reaction:add", {
                messageId: "msg-1",
                userId: "user-2",
                emoji: "👍",
                userName: "Bob"
            } satisfies ReactionPayload);
        });

        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(1);
        expect(msg?.reactions?.[0]).toEqual({
            emoji: "👍",
            count: 1,
            users: [{ id: "user-2", name: "Bob" }]
        });
    });

    it("socket reaction:add deduplicates when the same user+emoji arrives twice", async () => {
        const socket = createMockSocket();

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        const payload: ReactionPayload = {
            messageId: "msg-1",
            userId: "user-2",
            emoji: "👍",
            userName: "Bob"
        };

        act(() => {
            socket.__simulateEvent("reaction:add", payload);
            socket.__simulateEvent("reaction:add", payload); // duplicate
        });

        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(1);
        expect(msg?.reactions?.[0].count).toBe(1);
        expect(msg?.reactions?.[0].users).toHaveLength(1);
    });

    it("socket reaction:remove removes a reaction correctly", async () => {
        const socket = createMockSocket();

        const msgWithReaction = makeMessage({
            reactions: [
                {
                    emoji: "👍",
                    count: 1,
                    users: [{ id: "user-2", name: "Bob" }]
                }
            ]
        });

        global.fetch = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(
                    mockFetchResponse({ messages: [msgWithReaction], nextCursor: null })
                )
            );

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        act(() => {
            socket.__simulateEvent("reaction:remove", {
                messageId: "msg-1",
                userId: "user-2",
                emoji: "👍",
                userName: "Bob"
            } satisfies ReactionPayload);
        });

        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(0);
    });

    it("toggleReaction applies optimistic update from API response", async () => {
        const socket = createMockSocket();

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Mock the toggle API response
        global.fetch = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(
                    mockFetchResponse({ action: "added", userId: "user-1", userName: "Alice" })
                )
            );

        await act(async () => {
            await result.current.toggleReaction("msg-1", "🎉");
        });

        // State SHOULD have been updated from the API response
        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(1);
        expect(msg?.reactions?.[0].emoji).toBe("🎉");
        expect(msg?.reactions?.[0].count).toBe(1);
        expect(msg?.reactions?.[0].users).toEqual([{ id: "user-1", name: "Alice" }]);

        // Socket event arriving later should be a no-op (deduplication)
        act(() => {
            socket.__simulateEvent("reaction:add", {
                messageId: "msg-1",
                userId: "user-1",
                emoji: "🎉",
                userName: "Alice"
            } satisfies ReactionPayload);
        });

        const msgAfterSocket = result.current.messages.find((m) => m.id === "msg-1");
        expect(msgAfterSocket?.reactions).toHaveLength(1);
        expect(msgAfterSocket?.reactions?.[0].count).toBe(1);
    });

    it("toggleReaction removal applies optimistic update from API response", async () => {
        const socket = createMockSocket();

        const msgWithReaction = makeMessage({
            reactions: [
                {
                    emoji: "👍",
                    count: 1,
                    users: [{ id: "user-1", name: "Alice" }]
                }
            ]
        });

        global.fetch = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(
                    mockFetchResponse({ messages: [msgWithReaction], nextCursor: null })
                )
            );

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Mock the toggle API response for removal
        global.fetch = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(
                    mockFetchResponse({ action: "removed", userId: "user-1", userName: "Alice" })
                )
            );

        await act(async () => {
            await result.current.toggleReaction("msg-1", "👍");
        });

        // Reaction should be removed
        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(0);

        // Socket event arriving later should also be a no-op
        act(() => {
            socket.__simulateEvent("reaction:remove", {
                messageId: "msg-1",
                userId: "user-1",
                emoji: "👍",
                userName: "Alice"
            } satisfies ReactionPayload);
        });

        const msgAfterSocket = result.current.messages.find((m) => m.id === "msg-1");
        expect(msgAfterSocket?.reactions).toHaveLength(0);
    });

    it("multiple users adding the same emoji produces correct count", async () => {
        const socket = createMockSocket();

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        act(() => {
            socket.__simulateEvent("reaction:add", {
                messageId: "msg-1",
                userId: "user-2",
                emoji: "👍",
                userName: "Bob"
            });
            socket.__simulateEvent("reaction:add", {
                messageId: "msg-1",
                userId: "user-3",
                emoji: "👍",
                userName: "Charlie"
            });
        });

        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(1);
        expect(msg?.reactions?.[0].count).toBe(2);
        expect(msg?.reactions?.[0].users).toHaveLength(2);
    });
});
