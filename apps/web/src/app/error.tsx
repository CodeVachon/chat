"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function RootError({
    error,
    reset
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Root error boundary caught:", error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="max-w-md space-y-4 text-center">
                <h2 className="text-lg font-semibold">Something went wrong</h2>
                <p className="text-muted-foreground text-sm">
                    An unexpected error occurred. Please try again.
                </p>
                <Button onClick={reset}>Try again</Button>
            </div>
        </div>
    );
}
