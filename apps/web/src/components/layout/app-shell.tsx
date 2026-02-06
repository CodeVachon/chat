"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { useSession } from "@/lib/auth-client";

import { Sidebar } from "./sidebar";

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!isPending && !session?.user) {
            router.replace("/login");
        }
    }, [isPending, session, router]);

    if (isPending) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    if (!session?.user) {
        // Show loading while redirecting
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="bg-background flex h-screen">
            <Sidebar user={session.user} />
            <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        </div>
    );
}
