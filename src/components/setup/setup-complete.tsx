"use client";

import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SetupCompleteProps {
    organizationName: string;
    onComplete?: () => void;
}

export function SetupComplete({ organizationName, onComplete }: SetupCompleteProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFinish = useCallback(async () => {
        setIsLoading(true);
        setError("");

        try {
            // Mark setup as complete and create Town Hall channel
            const response = await fetch("/api/setup/complete", {
                method: "POST"
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to complete setup");
            }

            // Clear localStorage
            onComplete?.();

            router.push("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setIsLoading(false);
        }
    }, [onComplete, router]);

    useEffect(() => {
        // Auto-finish after 3 seconds (only if no error)
        const timer = setTimeout(() => {
            if (!error) {
                handleFinish();
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [error, handleFinish]);

    return (
        <Card>
            <CardHeader className="text-center">
                <div className="mb-4 flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle>Welcome to {organizationName}!</CardTitle>
                <CardDescription>
                    Your workspace is ready. We&apos;ve created a &quot;Town Hall&quot; channel for
                    you to get started.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button onClick={handleFinish} className="w-full" disabled={isLoading}>
                    {isLoading ? "Loading..." : "Go to Your Workspace"}
                </Button>
            </CardContent>
        </Card>
    );
}
