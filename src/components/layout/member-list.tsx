"use client";

import { Crown, Shield } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Member {
    userId: string;
    role: "owner" | "admin" | "member";
    user: {
        id: string;
        name: string;
        image?: string | null;
        status?: "online" | "away" | "dnd" | "offline" | null;
        statusMessage?: string | null;
    };
}

interface MemberListProps {
    members: Member[];
    onMemberClick?: (userId: string) => void;
}

export function MemberList({ members, onMemberClick }: MemberListProps) {
    // Group by online status
    const online = members.filter(
        (m) => m.user.status === "online" || m.user.status === "away" || m.user.status === "dnd"
    );
    const offline = members.filter((m) => !m.user.status || m.user.status === "offline");

    const MemberItem = ({ member }: { member: Member }) => (
        <button
            className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
            onClick={() => onMemberClick?.(member.userId)}
        >
            <div className="relative">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback>{member.user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span
                    className={cn(
                        "absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white",
                        member.user.status === "online" && "bg-green-500",
                        member.user.status === "away" && "bg-yellow-500",
                        member.user.status === "dnd" && "bg-red-500",
                        (!member.user.status || member.user.status === "offline") && "bg-gray-400"
                    )}
                />
            </div>
            <div className="flex flex-1 items-center gap-1 overflow-hidden">
                <span className="truncate text-sm">{member.user.name}</span>
                {member.role === "owner" && <Crown className="h-3 w-3 shrink-0 text-yellow-500" />}
                {member.role === "admin" && <Shield className="h-3 w-3 shrink-0 text-blue-500" />}
            </div>
        </button>
    );

    return (
        <div className="bg-card flex h-full w-60 flex-col border-l">
            <div className="border-b px-4 py-3">
                <h3 className="text-sm font-medium">Members — {members.length}</h3>
            </div>
            <ScrollArea className="flex-1 p-2">
                {online.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-muted-foreground mb-1 px-2 text-xs font-medium uppercase">
                            Online — {online.length}
                        </h4>
                        {online.map((member) => (
                            <MemberItem key={member.userId} member={member} />
                        ))}
                    </div>
                )}

                {offline.length > 0 && (
                    <div>
                        <h4 className="text-muted-foreground mb-1 px-2 text-xs font-medium uppercase">
                            Offline — {offline.length}
                        </h4>
                        {offline.map((member) => (
                            <MemberItem key={member.userId} member={member} />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
