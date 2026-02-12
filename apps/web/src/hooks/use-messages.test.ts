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
        parentId: null,
        createdAt: new Date().toISOString(),
        editedAt: null,
        author: { id: "user-1", name: "Alice", image: null },
        reactions: [],
        attachments: [],
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
// Optimistic send + rollback tests
// ---------------------------------------------------------------------------

describe("useMessages – sendMessage optimistic update", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        global.fetch = vi
            .fn()
            .mockResolvedValue(mockFetchResponse({ messages: [], nextCursor: null }));
    });

    it("adds optimistic message immediately before API responds", async () => {
        const socket = createMockSocket();
        let fetchResolve: (value: Response) => void;
        const fetchPromise = new Promise<Response>((resolve) => {
            fetchResolve = resolve;
        });

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise);

        let sendPromise: Promise<unknown>;
        act(() => {
            sendPromise = result.current.sendMessage("Hello world");
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe("Hello world");
        expect(result.current.messages[0].id).toMatch(/^temp-/);

        const serverMsg = makeMessage({ id: "server-1", content: "Hello world" });
        await act(async () => {
            fetchResolve!({
                ok: true,
                json: () => Promise.resolve(serverMsg)
            } as Response);
            await sendPromise!;
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].id).toBe("server-1");
    });

    it("rolls back optimistic message on API failure", async () => {
        const socket = createMockSocket();

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: "Server error" })
        });

        let error: Error | undefined;
        await act(async () => {
            try {
                await result.current.sendMessage("This will fail");
            } catch (e) {
                error = e as Error;
            }
        });

        expect(result.current.messages).toHaveLength(0);
        expect(error?.message).toBe("Failed to send message");
    });

    it("replaces temp message when socket event arrives before API response", async () => {
        const socket = createMockSocket();
        let fetchResolve: (value: Response) => void;
        const fetchPromise = new Promise<Response>((resolve) => {
            fetchResolve = resolve;
        });

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise);

        let sendPromise: Promise<unknown>;
        act(() => {
            sendPromise = result.current.sendMessage("Hello world");
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].id).toMatch(/^temp-/);

        const serverMsg = makeMessage({ id: "server-2", content: "Hello world" });
        act(() => {
            socket.__simulateEvent("message:new", serverMsg);
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].id).toBe("server-2");

        await act(async () => {
            fetchResolve!({
                ok: true,
                json: () => Promise.resolve(serverMsg)
            } as Response);
            await sendPromise!;
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].id).toBe("server-2");
    });

    it("handles network error during send with rollback", async () => {
        const socket = createMockSocket();

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch-1" })
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new TypeError("Failed to fetch")
        );

        let error: Error | undefined;
        await act(async () => {
            try {
                await result.current.sendMessage("Network failure");
            } catch (e) {
                error = e as Error;
            }
        });

        expect(result.current.messages).toHaveLength(0);
        expect(error?.message).toBe("Failed to fetch");
    });
});

// ---------------------------------------------------------------------------
// Reaction race condition tests
// ---------------------------------------------------------------------------

describe("useMessages – reaction race conditions", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
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
                emoji: "\u{1F44D}",
                userName: "Bob"
            } satisfies ReactionPayload);
        });

        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(1);
        expect(msg?.reactions?.[0]).toEqual({
            emoji: "\u{1F44D}",
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
            emoji: "\u{1F44D}",
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
                    emoji: "\u{1F44D}",
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
                emoji: "\u{1F44D}",
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

        global.fetch = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(
                    mockFetchResponse({ action: "added", userId: "user-1", userName: "Alice" })
                )
            );

        await act(async () => {
            await result.current.toggleReaction("msg-1", "\u{1F389}");
        });

        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(1);
        expect(msg?.reactions?.[0].emoji).toBe("\u{1F389}");
        expect(msg?.reactions?.[0].count).toBe(1);
        expect(msg?.reactions?.[0].users).toEqual([{ id: "user-1", name: "Alice" }]);

        act(() => {
            socket.__simulateEvent("reaction:add", {
                messageId: "msg-1",
                userId: "user-1",
                emoji: "\u{1F389}",
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
                    emoji: "\u{1F44D}",
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

        global.fetch = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve(
                    mockFetchResponse({ action: "removed", userId: "user-1", userName: "Alice" })
                )
            );

        await act(async () => {
            await result.current.toggleReaction("msg-1", "\u{1F44D}");
        });

        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(0);

        act(() => {
            socket.__simulateEvent("reaction:remove", {
                messageId: "msg-1",
                userId: "user-1",
                emoji: "\u{1F44D}",
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
                emoji: "\u{1F44D}",
                userName: "Bob"
            });
            socket.__simulateEvent("reaction:add", {
                messageId: "msg-1",
                userId: "user-3",
                emoji: "\u{1F44D}",
                userName: "Charlie"
            });
        });

        const msg = result.current.messages.find((m) => m.id === "msg-1");
        expect(msg?.reactions).toHaveLength(1);
        expect(msg?.reactions?.[0].count).toBe(2);
        expect(msg?.reactions?.[0].users).toHaveLength(2);
    });
});
