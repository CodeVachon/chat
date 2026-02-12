"use client";

import { Check, Copy, LinkIcon, Mail, Trash, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFormattedDate } from "@/hooks/use-formatted-date";
import { useSession } from "@/lib/auth-client";

interface InviteLink {
    id: string;
    code: string;
    url: string;
    createdAt: string;
    expiresAt: string | null;
    maxUses: number | null;
    useCount: number;
    createdByUser?: { name: string };
}

interface JoinRequest {
    id: string;
    name: string;
    email: string;
    message: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
}

export default function InvitesPage() {
    useSession(); // Ensures user is authenticated
    const { formatDate } = useFormattedDate();
    const [links, setLinks] = useState<InviteLink[]>([]);
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // New link form
    const [expiresIn, setExpiresIn] = useState<string>("7d");
    const [maxUses, setMaxUses] = useState<string>("");

    // Email invite form
    const [inviteEmail, setInviteEmail] = useState("");
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [linksRes, requestsRes] = await Promise.all([
                    fetch("/api/invites/link"),
                    fetch("/api/invites/requests")
                ]);

                if (linksRes.ok) {
                    setLinks(await linksRes.json());
                }
                if (requestsRes.ok) {
                    setRequests(await requestsRes.json());
                }
            } catch (err) {
                console.error("Error fetching invites:", err);
                toast.error("Failed to load invites");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const createLink = async () => {
        setIsCreating(true);

        try {
            const expiresInMs =
                expiresIn === "1h"
                    ? 60 * 60 * 1000
                    : expiresIn === "24h"
                      ? 24 * 60 * 60 * 1000
                      : expiresIn === "7d"
                        ? 7 * 24 * 60 * 60 * 1000
                        : expiresIn === "30d"
                          ? 30 * 24 * 60 * 60 * 1000
                          : null;

            const response = await fetch("/api/invites/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    expiresIn: expiresInMs,
                    maxUses: maxUses ? parseInt(maxUses) : null
                })
            });

            if (response.ok) {
                const newLink = await response.json();
                setLinks((prev) => [newLink, ...prev]);
            }
        } catch (err) {
            console.error("Error creating link:", err);
            toast.error("Failed to create invite link");
        } finally {
            setIsCreating(false);
        }
    };

    const deleteLink = async (id: string) => {
        try {
            const response = await fetch(`/api/invites/link/${id}`, {
                method: "DELETE"
            });

            if (response.ok) {
                setLinks((prev) => prev.filter((l) => l.id !== id));
            }
        } catch (err) {
            console.error("Error deleting link:", err);
            toast.error("Failed to delete invite link");
        }
    };

    const copyLink = async (link: InviteLink) => {
        await navigator.clipboard.writeText(link.url);
        setCopiedId(link.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRequest = async (id: string, status: "approved" | "rejected") => {
        try {
            const response = await fetch(`/api/invites/requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
            }
        } catch (err) {
            console.error("Error handling request:", err);
            toast.error("Failed to update access request");
        }
    };

    const sendEmailInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSendingEmail(true);
        setEmailSuccess(false);

        try {
            const response = await fetch("/api/invites/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail })
            });

            if (response.ok) {
                setInviteEmail("");
                setEmailSuccess(true);
                setTimeout(() => setEmailSuccess(false), 3000);
            }
        } catch (err) {
            console.error("Error sending email invite:", err);
            toast.error("Failed to send email invitation");
        } finally {
            setIsSendingEmail(false);
        }
    };

    const pendingRequests = requests.filter((r) => r.status === "pending");

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
                <h1 className="text-2xl font-bold">Invitations</h1>
                <p className="text-muted-foreground">Manage invite links and access requests</p>
            </div>

            <div className="p-6">
                <Tabs defaultValue="links">
                    <TabsList>
                        <TabsTrigger value="links">Invite Links</TabsTrigger>
                        <TabsTrigger value="email">Email Invite</TabsTrigger>
                        <TabsTrigger value="requests">
                            Requests
                            {pendingRequests.length > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                    {pendingRequests.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="links" className="space-y-4">
                        {/* Create new link */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Create Invite Link</CardTitle>
                                <CardDescription>
                                    Generate a new invite link for team members
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label>Expires In</Label>
                                        <Select
                                            value={expiresIn}
                                            onValueChange={(v) => v && setExpiresIn(v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1h">1 hour</SelectItem>
                                                <SelectItem value="24h">24 hours</SelectItem>
                                                <SelectItem value="7d">7 days</SelectItem>
                                                <SelectItem value="30d">30 days</SelectItem>
                                                <SelectItem value="never">Never</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label>Max Uses (optional)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Unlimited"
                                            value={maxUses}
                                            onChange={(e) => setMaxUses(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button onClick={createLink} disabled={isCreating}>
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    {isCreating ? "Creating..." : "Create Link"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Active links */}
                        <div className="space-y-2">
                            <h3 className="font-medium">Active Links</h3>
                            {links.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No active invite links
                                </p>
                            ) : (
                                links.map((link) => (
                                    <Card key={link.id}>
                                        <CardContent className="flex items-center gap-4 p-4">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-muted rounded px-2 py-1 text-sm">
                                                        {link.code}
                                                    </code>
                                                    <span className="text-muted-foreground text-xs">
                                                        {link.useCount}
                                                        {link.maxUses
                                                            ? `/${link.maxUses}`
                                                            : ""}{" "}
                                                        uses
                                                    </span>
                                                </div>
                                                <p className="text-muted-foreground text-xs">
                                                    Created by{" "}
                                                    {link.createdByUser?.name || "Unknown"}
                                                    {link.expiresAt &&
                                                        ` · Expires ${formatDate(link.expiresAt)}`}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyLink(link)}
                                            >
                                                {copiedId === link.id ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => deleteLink(link.id)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="email">
                        <Card>
                            <CardHeader>
                                <CardTitle>Email Invite</CardTitle>
                                <CardDescription>
                                    Send an invitation email directly to a new team member
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={sendEmailInvite} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="colleague@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    {emailSuccess && (
                                        <p className="text-sm text-green-600">
                                            Invitation sent successfully!
                                        </p>
                                    )}
                                    <Button type="submit" disabled={isSendingEmail}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        {isSendingEmail ? "Sending..." : "Send Invitation"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="requests" className="space-y-2">
                        {requests.length === 0 ? (
                            <p className="text-muted-foreground">No access requests</p>
                        ) : (
                            requests.map((request) => (
                                <Card key={request.id}>
                                    <CardContent className="flex items-center gap-4 p-4">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{request.name}</span>
                                                <Badge
                                                    variant={
                                                        request.status === "pending"
                                                            ? "outline"
                                                            : request.status === "approved"
                                                              ? "default"
                                                              : "destructive"
                                                    }
                                                >
                                                    {request.status}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground text-sm">
                                                {request.email}
                                            </p>
                                            {request.message && (
                                                <p className="text-sm">{request.message}</p>
                                            )}
                                        </div>
                                        {request.status === "pending" && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleRequest(request.id, "approved")
                                                    }
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleRequest(request.id, "rejected")
                                                    }
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
