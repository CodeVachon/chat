"use client";

import { Check, Copy, Mail, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SetupInviteProps {
    onComplete: () => void;
    onSkip: () => void;
}

export function SetupInvite({ onComplete, onSkip }: SetupInviteProps) {
    const [inviteLink, setInviteLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [emails, setEmails] = useState<string[]>([]);
    const [emailInput, setEmailInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGenerateLink = async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/invites/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ expiresIn: 7 * 24 * 60 * 60 * 1000 }) // 7 days
            });

            if (!response.ok) {
                throw new Error("Failed to generate invite link");
            }

            const data = await response.json();
            setInviteLink(`${window.location.origin}/invite/${data.code}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddEmail = () => {
        const trimmed = emailInput.trim();
        if (trimmed && !emails.includes(trimmed) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setEmails([...emails, trimmed]);
            setEmailInput("");
        }
    };

    const handleRemoveEmail = (email: string) => {
        setEmails(emails.filter((e) => e !== email));
    };

    const handleSendInvites = async () => {
        if (emails.length === 0) {
            onComplete();
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/invites/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emails })
            });

            if (!response.ok) {
                throw new Error("Failed to send invites");
            }

            onComplete();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invite Your Team</CardTitle>
                <CardDescription>
                    Share an invite link or send email invitations to your teammates.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <Label>Invite Link</Label>
                    {inviteLink ? (
                        <div className="flex gap-2">
                            <Input value={inviteLink} readOnly className="font-mono text-sm" />
                            <Button variant="outline" size="icon" onClick={handleCopyLink}>
                                {copied ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={handleGenerateLink} disabled={isLoading}>
                            Generate Invite Link
                        </Button>
                    )}
                </div>

                <div className="space-y-3">
                    <Label>Email Invites</Label>
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            placeholder="teammate@example.com"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && (e.preventDefault(), handleAddEmail())
                            }
                        />
                        <Button variant="outline" onClick={handleAddEmail}>
                            <Mail className="h-4 w-4" />
                        </Button>
                    </div>
                    {emails.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {emails.map((email) => (
                                <div
                                    key={email}
                                    className="bg-muted flex items-center gap-1 rounded-full px-3 py-1 text-sm"
                                >
                                    {email}
                                    <button
                                        onClick={() => handleRemoveEmail(email)}
                                        className="text-muted-foreground hover:text-foreground ml-1"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {error && <p className="text-destructive text-sm">{error}</p>}

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={onSkip}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        Skip for Now
                    </Button>
                    <Button onClick={handleSendInvites} disabled={isLoading} className="flex-1">
                        {isLoading
                            ? "Sending..."
                            : emails.length > 0
                              ? "Send Invites & Continue"
                              : "Continue"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
