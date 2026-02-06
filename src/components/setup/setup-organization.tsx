"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SetupOrganizationProps {
    onComplete: (data: { name: string; slug: string }) => void;
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

export function SetupOrganization({ onComplete }: SetupOrganizationProps) {
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleNameChange = (value: string) => {
        setName(value);
        setSlug(generateSlug(value));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/setup/organization", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, slug })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to create organization");
            }

            onComplete({ name, slug });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Organization</CardTitle>
                <CardDescription>
                    This will be your workspace where your team collaborates.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Organization Name</Label>
                        <Input
                            id="name"
                            placeholder="Acme Inc"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slug">URL Slug</Label>
                        <Input
                            id="slug"
                            placeholder="acme-inc"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            required
                        />
                        <p className="text-muted-foreground text-sm">
                            Your workspace will be accessible at this URL
                        </p>
                    </div>
                    {error && <p className="text-destructive text-sm">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading || !name || !slug}>
                        {isLoading ? "Creating..." : "Continue"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
