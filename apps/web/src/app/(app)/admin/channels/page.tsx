"use client";

import { Archive, Hash, Lock, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CreateChannelModal } from "@/components/channel/create-channel-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth-client";

interface Channel {
    id: string;
    name: string;
    emoji: string | null;
    description: string | null;
    isPrivate: boolean;
    ownerId: string;
    createdAt: string;
    archivedAt: string | null;
    _count?: {
        members: number;
    };
}

export default function ChannelsPage() {
    useSession(); // Ensures user is authenticated
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const response = await fetch("/api/channels");
                if (response.ok) {
                    const data = await response.json();
                    setChannels(data);
                }
            } catch (err) {
                console.error("Error fetching channels:", err);
                toast.error("Failed to load channels");
            } finally {
                setIsLoading(false);
            }
        };

        fetchChannels();
    }, []);

    const archiveChannel = async (id: string) => {
        if (!confirm("Are you sure you want to archive this channel?")) return;

        try {
            const response = await fetch(`/api/channels/${id}`, {
                method: "DELETE"
            });

            if (response.ok) {
                setChannels((prev) =>
                    prev.map((c) =>
                        c.id === id ? { ...c, archivedAt: new Date().toISOString() } : c
                    )
                );
            }
        } catch (err) {
            console.error("Error archiving channel:", err);
            toast.error("Failed to archive channel");
        }
    };

    const handleChannelCreated = async () => {
        setShowCreate(false);
        // Refetch channels
        const response = await fetch("/api/channels");
        if (response.ok) {
            setChannels(await response.json());
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    const activeChannels = channels.filter((c) => !c.archivedAt);
    const archivedChannels = channels.filter((c) => c.archivedAt);

    return (
        <div className="flex flex-1 flex-col overflow-auto">
            <div className="border-b p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Channels</h1>
                        <p className="text-muted-foreground">
                            {activeChannels.length} active channel
                            {activeChannels.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <Button onClick={() => setShowCreate(true)}>Create Channel</Button>
                </div>
            </div>

            <div className="space-y-6 p-6">
                {/* Active Channels */}
                <div className="space-y-2">
                    <h3 className="font-medium">Active Channels</h3>
                    {activeChannels.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No active channels</p>
                    ) : (
                        activeChannels.map((channel) => (
                            <Card key={channel.id}>
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="text-muted-foreground">
                                        {channel.emoji || <Hash className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{channel.name}</span>
                                            {channel.isPrivate && (
                                                <Badge variant="secondary" className="gap-1">
                                                    <Lock className="h-3 w-3" />
                                                    Private
                                                </Badge>
                                            )}
                                        </div>
                                        {channel.description && (
                                            <p className="text-muted-foreground line-clamp-1 text-sm">
                                                {channel.description}
                                            </p>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => archiveChannel(channel.id)}
                                            >
                                                <Archive className="mr-2 h-4 w-4" />
                                                Archive
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Archived Channels */}
                {archivedChannels.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-muted-foreground font-medium">Archived Channels</h3>
                        {archivedChannels.map((channel) => (
                            <Card key={channel.id} className="opacity-60">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="text-muted-foreground">
                                        {channel.emoji || <Hash className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{channel.name}</span>
                                            <Badge variant="outline">Archived</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <CreateChannelModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={handleChannelCreated}
            />
        </div>
    );
}
