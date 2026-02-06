"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import type { Channel } from "@/db/schema";

interface ChannelsContextType {
    channels: Channel[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createChannel: (data: {
        name: string;
        emoji?: string;
        description?: string;
        isPrivate?: boolean;
    }) => Promise<Channel>;
    joinChannel: (channelId: string) => Promise<void>;
    leaveChannel: (channelId: string) => Promise<void>;
}

const ChannelsContext = createContext<ChannelsContextType | null>(null);

export function ChannelsProvider({ children }: { children: ReactNode }) {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchChannels = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/channels");
            if (!response.ok) {
                throw new Error("Failed to fetch channels");
            }

            const data = await response.json();
            setChannels(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChannels();
    }, [fetchChannels]);

    const createChannel = useCallback(
        async (data: {
            name: string;
            emoji?: string;
            description?: string;
            isPrivate?: boolean;
        }) => {
            const response = await fetch("/api/channels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create channel");
            }

            const newChannel = await response.json();

            // Add to state
            setChannels((prev) =>
                [...prev, newChannel].sort((a, b) => a.name.localeCompare(b.name))
            );

            return newChannel;
        },
        []
    );

    const joinChannel = useCallback(
        async (channelId: string) => {
            const response = await fetch(`/api/channels/${channelId}/join`, {
                method: "POST"
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to join channel");
            }

            // Refetch to get updated membership
            await fetchChannels();
        },
        [fetchChannels]
    );

    const leaveChannel = useCallback(async (channelId: string) => {
        const response = await fetch(`/api/channels/${channelId}/leave`, {
            method: "POST"
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to leave channel");
        }

        // Remove from local state
        setChannels((prev) => prev.filter((c) => c.id !== channelId));
    }, []);

    return (
        <ChannelsContext.Provider
            value={{
                channels,
                isLoading,
                error,
                refetch: fetchChannels,
                createChannel,
                joinChannel,
                leaveChannel
            }}
        >
            {children}
        </ChannelsContext.Provider>
    );
}

export function useChannels() {
    const context = useContext(ChannelsContext);

    if (!context) {
        throw new Error("useChannels must be used within a ChannelsProvider");
    }

    return context;
}
