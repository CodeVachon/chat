"use client";

import { cn } from "@/lib/utils";

type Status = "online" | "away" | "dnd" | "offline";

interface PresenceIndicatorProps {
    status: Status;
    className?: string;
}

export function PresenceIndicator({ status, className }: PresenceIndicatorProps) {
    return (
        <span
            className={cn(
                "h-3 w-3 rounded-full border-2 border-white",
                status === "online" && "bg-green-500",
                status === "away" && "bg-yellow-500",
                status === "dnd" && "bg-red-500",
                status === "offline" && "bg-gray-400",
                className
            )}
        />
    );
}
