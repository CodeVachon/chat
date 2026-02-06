"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useChannels } from "@/hooks";

export default function HomePage() {
    const router = useRouter();
    const { channels, isLoading } = useChannels();

    useEffect(() => {
        if (!isLoading && channels.length > 0) {
            // Redirect to first channel (usually Town Hall)
            router.replace(`/channels/${channels[0].id}`);
        }
    }, [isLoading, channels, router]);

    return (
        <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
                <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                <p className="text-muted-foreground mt-4">Loading...</p>
            </div>
        </div>
    );
}
