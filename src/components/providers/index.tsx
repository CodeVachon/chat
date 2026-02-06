"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "./auth-provider";
import { ChannelsProvider } from "./channels-provider";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ChannelsProvider>{children}</ChannelsProvider>
        </AuthProvider>
    );
}

export { useSession } from "./auth-provider";
export { useChannels } from "./channels-provider";
