"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSidebar } from "@/hooks";
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
            {/* Desktop sidebar - always visible at md+ */}
            <div className="hidden md:flex">
                <Sidebar user={session.user} />
            </div>

            {/* Mobile sidebar - Sheet drawer for < md */}
            <MobileSidebar user={session.user} />

            <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
        </div>
    );
}

function MobileSidebar({
    user
}: {
    user: { id: string; name: string; email: string; image?: string | null };
}) {
    const { isOpen, close } = useSidebar();

    return (
        <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
                <SheetContent side="left" showCloseButton={false} className="!w-64 gap-0 p-0">
                    <Sidebar user={user} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
