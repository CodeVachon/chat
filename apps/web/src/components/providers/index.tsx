"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { AuthProvider } from "./auth-provider";
import { ChannelsProvider } from "./channels-provider";
import { PreferencesProvider } from "./preferences-provider";
import { SidebarProvider } from "./sidebar-provider";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AuthProvider>
                <PreferencesProvider>
                    <ChannelsProvider>
                        <SidebarProvider>{children}</SidebarProvider>
                    </ChannelsProvider>
                </PreferencesProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export { useSession } from "./auth-provider";
export { useChannels } from "./channels-provider";
