import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock socket.io-client
vi.mock("socket.io-client", () => ({}));

import type { MessagePayload } from "@chat/events";

import { useMessages } from "./use-messages";

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
        _emit(event: string, data: unknown) {
            listeners.get(event)?.forEach((handler) => handler(data));
        }
    };
}

function makeMessage(overrides: Partial<MessagePayload> = {}): MessagePayload {
    return {
        id: "msg-1",
        content: "Hello",
        contentHtml: null,
        channelId: "ch1",
        conversationId: null,
        authorId: "user1",
        parentId: null,
        createdAt: new Date().toISOString(),
        editedAt: null,
        author: { id: "user1", name: "Alice", image: null },
        reactions: [],
        attachments: [],
        ...overrides
    };
}

describe("useMessages - sendMessage optimistic update", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // Mock initial fetch to return empty messages
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ messages: [], nextCursor: null })
        });
    });

    it("adds optimistic message immediately before API responds", async () => {
        const socket = createMockSocket();
        let fetchResolve: (value: Response) => void;
        const fetchPromise = new Promise<Response>((resolve) => {
            fetchResolve = resolve;
        });

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch1" })
        );

        // Wait for initial fetch
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Override fetch for sendMessage
        (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise);

        // Start sending — don't await yet
        let sendPromise: Promise<unknown>;
        act(() => {
            sendPromise = result.current.sendMessage("Hello world");
        });

        // Message should appear immediately with a temp ID
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].content).toBe("Hello world");
        expect(result.current.messages[0].id).toMatch(/^temp-/);

        // Now resolve the API response
        const serverMsg = makeMessage({ id: "server-1", content: "Hello world" });
        await act(async () => {
            fetchResolve!({
                ok: true,
                json: () => Promise.resolve(serverMsg)
            } as Response);
            await sendPromise!;
        });

        // Temp message should be replaced with server message
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].id).toBe("server-1");
    });

    it("rolls back optimistic message on API failure", async () => {
        const socket = createMockSocket();

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch1" })
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Override fetch to reject
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

        // The optimistic message should be removed
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
            useMessages({ socket: socket as never, channelId: "ch1" })
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(fetchPromise);

        let sendPromise: Promise<unknown>;
        act(() => {
            sendPromise = result.current.sendMessage("Hello world");
        });

        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].id).toMatch(/^temp-/);

        // Socket event arrives before API response
        const serverMsg = makeMessage({ id: "server-2", content: "Hello world" });
        act(() => {
            socket._emit("message:new", serverMsg);
        });

        // The temp message should be replaced by the socket event
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].id).toBe("server-2");

        // Resolve the fetch so the promise completes
        await act(async () => {
            fetchResolve!({
                ok: true,
                json: () => Promise.resolve(serverMsg)
            } as Response);
            await sendPromise!;
        });

        // Should still have exactly one message (no duplicates)
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].id).toBe("server-2");
    });

    it("handles network error during send with rollback", async () => {
        const socket = createMockSocket();

        const { result } = renderHook(() =>
            useMessages({ socket: socket as never, channelId: "ch1" })
        );

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Override fetch to throw a network error
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
