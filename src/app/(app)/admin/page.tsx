"use client";

import { LinkIcon, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";

interface Stats {
    totalUsers: number;
    totalChannels: number;
    pendingRequests: number;
    activeInvites: number;
}

export default function AdminPage() {
    const { data: session, isPending } = useSession();
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [usersRes, channelsRes, requestsRes, invitesRes] = await Promise.all([
                    fetch("/api/users"),
                    fetch("/api/channels"),
                    fetch("/api/invites/requests"),
                    fetch("/api/invites/link")
                ]);

                const users = usersRes.ok ? await usersRes.json() : [];
                const channels = channelsRes.ok ? await channelsRes.json() : [];
                const requests = requestsRes.ok ? await requestsRes.json() : [];
                const invites = invitesRes.ok ? await invitesRes.json() : [];

                setStats({
                    totalUsers: users.length,
                    totalChannels: channels.length,
                    pendingRequests: requests.filter(
                        (r: { status: string }) => r.status === "pending"
                    ).length,
                    activeInvites: invites.length
                });
            } catch (err) {
                console.error("Error fetching stats:", err);
            }
        };

        if (session?.user) {
            fetchStats();
        }
    }, [session]);

    // Check if user has admin permissions
    const userRole = (session?.user as { orgRole?: string })?.orgRole;
    const isAdmin = userRole === "owner" || userRole === "admin";

    if (isPending) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>
                            You don&apos;t have permission to access the admin panel.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const cards = [
        {
            title: "Members",
            description: "Manage team members and roles",
            href: "/admin/members",
            icon: Users,
            stat: stats?.totalUsers
        },
        {
            title: "Channels",
            description: "Manage channels and settings",
            href: "/admin/channels",
            icon: MessageSquare,
            stat: stats?.totalChannels
        },
        {
            title: "Invitations",
            description: "Manage invite links and requests",
            href: "/admin/invites",
            icon: LinkIcon,
            stat: stats?.pendingRequests
                ? `${stats.pendingRequests} pending`
                : stats?.activeInvites
                  ? `${stats.activeInvites} active`
                  : undefined
        }
    ];

    return (
        <div className="flex flex-1 flex-col overflow-auto">
            <div className="border-b p-6">
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <p className="text-muted-foreground">Manage your organization</p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <Link key={card.href} href={card.href}>
                        <Card className="hover:bg-muted/50 transition-colors">
                            <CardHeader className="flex flex-row items-center gap-4">
                                <div className="bg-primary/10 rounded-lg p-2">
                                    <card.icon className="text-primary h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{card.title}</CardTitle>
                                    <CardDescription>{card.description}</CardDescription>
                                </div>
                            </CardHeader>
                            {card.stat !== undefined && (
                                <CardContent>
                                    <p className="text-muted-foreground text-sm">{card.stat}</p>
                                </CardContent>
                            )}
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
