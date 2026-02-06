"use client";

import { Hash, Info, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";

interface HeaderProps {
    type: "channel" | "dm";
    name: string;
    emoji?: string | null;
    description?: string | null;
    onMembersClick?: () => void;
    onSettingsClick?: () => void;
}

export function Header({
    type,
    name,
    emoji,
    description,
    onMembersClick,
    onSettingsClick
}: HeaderProps) {
    return (
        <div className="bg-card flex h-14 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
                {type === "channel" && (
                    <span className="text-muted-foreground">
                        {emoji || <Hash className="h-5 w-5" />}
                    </span>
                )}
                <h2 className="text-lg font-semibold">{name}</h2>
                {description && (
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Info className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    {emoji && <span>{emoji}</span>}
                                    {name}
                                </SheetTitle>
                                <SheetDescription>{description}</SheetDescription>
                            </SheetHeader>
                        </SheetContent>
                    </Sheet>
                )}
            </div>

            <div className="flex items-center gap-1">
                {type === "channel" && onMembersClick && (
                    <Button variant="ghost" size="icon" onClick={onMembersClick}>
                        <Users className="h-5 w-5" />
                    </Button>
                )}
                {type === "channel" && onSettingsClick && (
                    <Button variant="ghost" size="icon" onClick={onSettingsClick}>
                        <Settings className="h-5 w-5" />
                    </Button>
                )}
            </div>
        </div>
    );
}
