"use client";

import { MoreHorizontal, Shield, ShieldAlert, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";

interface Member {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    orgRole: "owner" | "admin" | "member";
    status: "online" | "away" | "dnd" | "offline";
    createdAt: string;
}

export default function MembersPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const userRole = (session?.user as { orgRole?: string })?.orgRole;
    const isOwner = userRole === "owner";

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch("/api/users");
                if (response.ok) {
                    const data = await response.json();
                    setMembers(data);
                }
            } catch (err) {
                console.error("Error fetching members:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMembers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgRole: newRole })
            });

            if (response.ok) {
                setMembers((prev) =>
                    prev.map((m) =>
                        m.id === userId ? { ...m, orgRole: newRole as Member["orgRole"] } : m
                    )
                );
            }
        } catch (err) {
            console.error("Error changing role:", err);
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return;

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                setMembers((prev) => prev.filter((m) => m.id !== userId));
            }
        } catch (err) {
            console.error("Error removing member:", err);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "owner":
                return (
                    <Badge variant="default" className="gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        Owner
                    </Badge>
                );
            case "admin":
                return (
                    <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Admin
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="gap-1">
                        <User className="h-3 w-3" />
                        Member
                    </Badge>
                );
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col overflow-auto">
            <div className="border-b p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Members</h1>
                        <p className="text-muted-foreground">
                            {members.length} member{members.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <Button onClick={() => router.push("/admin/invites")}>Invite Members</Button>
                </div>
            </div>

            <div className="space-y-2 p-6">
                {members.map((member) => (
                    <Card key={member.id}>
                        <CardContent className="flex items-center gap-4 p-4">
                            <Avatar>
                                <AvatarImage src={member.image || undefined} />
                                <AvatarFallback>
                                    {member.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{member.name}</span>
                                    {getRoleBadge(member.orgRole)}
                                </div>
                                <span className="text-muted-foreground text-sm">
                                    {member.email}
                                </span>
                            </div>

                            {/* Role selector for owners only */}
                            {isOwner && member.orgRole !== "owner" && (
                                <Select
                                    value={member.orgRole}
                                    onValueChange={(value) =>
                                        value && handleRoleChange(member.id, value)
                                    }
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="member">Member</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Actions menu */}
                            {member.id !== session?.user?.id && member.orgRole !== "owner" && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => handleRemove(member.id)}
                                            className="text-destructive"
                                        >
                                            Remove from organization
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
