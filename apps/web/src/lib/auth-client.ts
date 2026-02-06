"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL
});

// Export non-hook functions from better-auth
export const { signIn, signUp, signOut } = authClient;

// Re-export useSession from our custom provider for React 19 compatibility
export { useSession } from "@/components/providers/auth-provider";
