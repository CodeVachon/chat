"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";

export function ProfileForm() {
    const { data: session } = useSession();

    const [name, setName] = useState(session?.user?.name || "");
    const [status, setStatus] = useState<string>("online");
    const [statusMessage, setStatusMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.user?.id) return;

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(`/api/users/${session.user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    status,
                    statusMessage: statusMessage || null
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update profile");
            }

            setSuccess("Profile updated successfully");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    if (!session?.user) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information and status</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 shrink-0 md:h-20 md:w-20">
                            <AvatarImage src={session.user.image || undefined} />
                            <AvatarFallback className="text-lg md:text-2xl">
                                {session.user.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="truncate font-medium">{session.user.email}</p>
                            <p className="text-muted-foreground truncate text-sm">
                                Avatar changes coming soon
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={(value) => value && setStatus(value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-green-500" />
                                        Online
                                    </span>
                                </SelectItem>
                                <SelectItem value="away">
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                                        Away
                                    </span>
                                </SelectItem>
                                <SelectItem value="dnd">
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-red-500" />
                                        Do Not Disturb
                                    </span>
                                </SelectItem>
                                <SelectItem value="offline">
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-gray-400" />
                                        Invisible
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="statusMessage">Status Message (optional)</Label>
                        <Textarea
                            id="statusMessage"
                            placeholder="What's on your mind?"
                            value={statusMessage}
                            onChange={(e) => setStatusMessage(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {error && <p className="text-destructive text-sm">{error}</p>}
                    {success && <p className="text-sm text-green-600">{success}</p>}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
