"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

interface User {
    id: string;
    email: string;
    name: string;
    image?: string | null;
}

interface Session {
    user: User;
}

interface AuthContextType {
    session: Session | null;
    isPending: boolean;
    refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isPending, setIsPending] = useState(true);

    const fetchSession = useCallback(async () => {
        try {
            const response = await fetch("/api/auth/get-session", {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                // better-auth returns { session, user } at the top level
                if (data?.user) {
                    setSession({ user: data.user });
                } else if (data?.session?.user) {
                    setSession(data.session);
                } else {
                    setSession(null);
                }
            } else {
                setSession(null);
            }
        } catch (error) {
            console.error("Failed to fetch session:", error);
            setSession(null);
        } finally {
            setIsPending(false);
        }
    }, []);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    return (
        <AuthContext.Provider value={{ session, isPending, refetch: fetchSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useSession() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useSession must be used within an AuthProvider");
    }

    return {
        data: context.session,
        isPending: context.isPending,
        refetch: context.refetch
    };
}
