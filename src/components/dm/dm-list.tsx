"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Conversation {
    id: string;
    participants: {
        id: string;
        name: string;
        image?: string | null;
        status?: "online" | "away" | "dnd" | "offline" | null;
    }[];
}

export function DMList() {
    const pathname = usePathname();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const response = await fetch("/api/dm");
                if (response.ok) {
                    const data = await response.json();
                    setConversations(data);
                }
            } catch (err) {
                console.error("Error fetching DMs:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversations();
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-1 px-2">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    if (conversations.length === 0) {
        return <p className="text-muted-foreground px-2 text-sm">No conversations yet</p>;
    }

    return (
        <div className="space-y-0.5">
            {conversations.map((conv) => {
                const otherUser = conv.participants[0];
                if (!otherUser) return null;

                const isActive = pathname === `/dm/${conv.id}`;

                return (
                    <Link
                        key={conv.id}
                        href={`/dm/${conv.id}`}
                        className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                            isActive
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                    >
                        <div className="relative">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={otherUser.image || undefined} />
                                <AvatarFallback>
                                    {otherUser.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span
                                className={cn(
                                    "absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                                    otherUser.status === "online" && "bg-green-500",
                                    otherUser.status === "away" && "bg-yellow-500",
                                    otherUser.status === "dnd" && "bg-red-500",
                                    (!otherUser.status || otherUser.status === "offline") &&
                                        "bg-gray-400"
                                )}
                            />
                        </div>
                        <span className="truncate text-sm">{otherUser.name}</span>
                    </Link>
                );
            })}
        </div>
    );
}
