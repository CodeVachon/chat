"use client";

import { Hash, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useChannels } from "@/hooks";
import { cn } from "@/lib/utils";

export function ChannelList() {
    const pathname = usePathname();
    const { channels, isLoading, error } = useChannels();

    if (isLoading) {
        return (
            <div className="space-y-1 px-2">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                ))}
            </div>
        );
    }

    if (error) {
        return <p className="text-destructive px-2 text-sm">{error}</p>;
    }

    if (channels.length === 0) {
        return <p className="text-muted-foreground px-2 text-sm">No channels yet</p>;
    }

    return (
        <div className="space-y-0.5">
            {channels.map((channel) => {
                const isActive = pathname === `/channels/${channel.id}`;
                return (
                    <Link
                        key={channel.id}
                        href={`/channels/${channel.id}`}
                        className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                            isActive
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                    >
                        {channel.emoji ? (
                            <span className="w-5 text-center">{channel.emoji}</span>
                        ) : channel.isPrivate ? (
                            <Lock className="h-4 w-4" />
                        ) : (
                            <Hash className="h-4 w-4" />
                        )}
                        <span className="truncate">{channel.name}</span>
                    </Link>
                );
            })}
        </div>
    );
}
