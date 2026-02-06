"use client";

import { LogOut, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ChannelList } from "@/components/channel/channel-list";
import { CreateChannelModal } from "@/components/channel/create-channel-modal";
import { DMList } from "@/components/dm/dm-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth-client";

interface SidebarProps {
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    };
}

export function Sidebar({ user }: SidebarProps) {
    const [showCreateChannel, setShowCreateChannel] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        window.location.href = "/login";
    };

    return (
        <div className="bg-card flex h-full w-64 flex-col border-r">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b px-4">
                <h1 className="text-lg font-semibold">Chat</h1>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-2 py-2">
                {/* Channels Section */}
                <div className="mb-4">
                    <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-muted-foreground text-xs font-medium uppercase">
                            Channels
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => setShowCreateChannel(true)}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>
                    <ChannelList />
                </div>

                <Separator className="my-2" />

                {/* Direct Messages Section */}
                <div>
                    <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-muted-foreground text-xs font-medium uppercase">
                            Direct Messages
                        </span>
                    </div>
                    <DMList />
                </div>
            </ScrollArea>

            {/* User section */}
            <div className="border-t p-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.image || undefined} />
                                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-1 flex-col items-start overflow-hidden">
                                <span className="truncate text-sm font-medium">{user.name}</span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {user.email}
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link href="/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <CreateChannelModal open={showCreateChannel} onOpenChange={setShowCreateChannel} />
        </div>
    );
}
