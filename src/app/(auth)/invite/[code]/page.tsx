"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";

interface InvitePageProps {
    params: Promise<{ code: string }>;
}

interface InviteDetails {
    valid: boolean;
    organizationName?: string;
    invitedBy?: string;
    error?: string;
}

export default function InvitePage({ params }: InvitePageProps) {
    const { code } = use(params);
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [error, setError] = useState("");

    // Fetch invite details
    useEffect(() => {
        const fetchInvite = async () => {
            try {
                const response = await fetch(`/api/invites/link/${code}`);
                const data = await response.json();

                if (!response.ok) {
                    setInvite({ valid: false, error: data.error || "Invalid invite" });
                } else {
                    setInvite({ valid: true, ...data });
                }
            } catch {
                setInvite({ valid: false, error: "Failed to verify invite" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvite();
    }, [code]);

    const handleAccept = async () => {
        setIsAccepting(true);
        setError("");

        try {
            const response = await fetch(`/api/invites/link/${code}/accept`, {
                method: "POST"
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to accept invite");
            }

            router.push("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsAccepting(false);
        }
    };

    if (isLoading || isPending) {
        return (
            <div className="bg-background flex min-h-screen items-center justify-center">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    if (!invite?.valid) {
        return (
            <div className="bg-background flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Invalid Invite</CardTitle>
                        <CardDescription>
                            {invite?.error || "This invite link is invalid or has expired."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push("/login")} className="w-full">
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // User is logged in - show accept button
    if (session?.user) {
        return (
            <div className="bg-background flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Join Team</CardTitle>
                        <CardDescription>
                            {invite.invitedBy
                                ? `${invite.invitedBy} has invited you to join`
                                : "You've been invited to join the team"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground text-center text-sm">
                            Signed in as <strong>{session.user.email}</strong>
                        </p>

                        {error && <p className="text-destructive text-center text-sm">{error}</p>}

                        <Button onClick={handleAccept} className="w-full" disabled={isAccepting}>
                            {isAccepting ? "Joining..." : "Accept Invite"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // User is not logged in - show login/signup options
    return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>You&apos;re Invited!</CardTitle>
                    <CardDescription>
                        {invite.invitedBy
                            ? `${invite.invitedBy} has invited you to join the team`
                            : "You've been invited to join the team"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={() => router.push(`/signup?token=${code}`)} className="w-full">
                        Create Account
                    </Button>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background text-muted-foreground px-2">Or</span>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/login?callbackUrl=/invite/${code}`)}
                        className="w-full"
                    >
                        Sign In
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
