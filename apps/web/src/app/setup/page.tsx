"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { SetupComplete } from "@/components/setup/setup-complete";
import { SetupInvite } from "@/components/setup/setup-invite";
import { SetupOrganization } from "@/components/setup/setup-organization";
import { SetupOwner } from "@/components/setup/setup-owner";

type SetupStep = "organization" | "owner" | "invite" | "complete";

interface SetupData {
    organization?: {
        name: string;
        slug: string;
    };
    owner?: {
        name: string;
        email: string;
    };
}

const STORAGE_KEY = "chat-setup-data";

function loadSetupData(): SetupData {
    if (typeof window === "undefined") return {};
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function saveSetupData(data: SetupData) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // Ignore storage errors
    }
}

function clearSetupData() {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore storage errors
    }
}

export default function SetupPage() {
    const searchParams = useSearchParams();
    const [step, setStep] = useState<SetupStep>("organization");
    const [data, setData] = useState<SetupData>({});
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize from URL params and localStorage on mount
    useEffect(() => {
        const initialize = async () => {
            const storedData = loadSetupData();

            // Verify organization exists in database
            try {
                const response = await fetch("/api/setup/status");
                const status = await response.json();

                if (status.organizationExists) {
                    // Org exists in DB - sync localStorage if needed
                    if (!storedData.organization && status.organization) {
                        storedData.organization = {
                            name: status.organization.name,
                            slug: status.organization.slug
                        };
                        saveSetupData(storedData);
                    }
                } else {
                    // Org doesn't exist in DB - clear any stale localStorage
                    if (storedData.organization) {
                        clearSetupData();
                        storedData.organization = undefined;
                        storedData.owner = undefined;
                    }
                }

                setData(storedData);

                // Check URL param for step (used after OAuth redirect)
                const stepParam = searchParams.get("step");
                if (
                    stepParam &&
                    ["organization", "owner", "invite", "complete"].includes(stepParam)
                ) {
                    // If coming back from OAuth with step=invite, we need to ensure org exists
                    if (stepParam === "invite" && status.organizationExists) {
                        setStep("invite");
                    } else if (stepParam === "owner" && status.organizationExists) {
                        setStep("owner");
                    } else if (status.organizationExists) {
                        // We have org, at minimum go to owner step
                        setStep("owner");
                    }
                } else if (status.organizationExists) {
                    // Resume from where we left off
                    if (storedData.owner || status.hasUsers) {
                        setStep("invite");
                    } else {
                        setStep("owner");
                    }
                }
            } catch {
                // If API fails, fall back to localStorage only
                setData(storedData);
                if (storedData.organization) {
                    if (storedData.owner) {
                        setStep("invite");
                    } else {
                        setStep("owner");
                    }
                }
            }

            setIsInitialized(true);
        };

        initialize();
    }, [searchParams]);

    const handleOrganizationComplete = (orgData: { name: string; slug: string }) => {
        const newData = { ...data, organization: orgData };
        setData(newData);
        saveSetupData(newData);
        setStep("owner");
    };

    const handleOwnerComplete = (ownerData: { name: string; email: string }) => {
        const newData = { ...data, owner: ownerData };
        setData(newData);
        saveSetupData(newData);
        setStep("invite");
    };

    const handleInviteComplete = () => {
        setStep("complete");
    };

    const handleSkipInvite = () => {
        setStep("complete");
    };

    const handleSetupComplete = () => {
        clearSetupData();
    };

    // Show loading while initializing to prevent flash
    if (!isInitialized) {
        return (
            <div className="bg-background flex min-h-screen items-center justify-center p-4">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold">Welcome to Chat</h1>
                    <p className="text-muted-foreground mt-2">
                        {step === "organization" && "Let's set up your organization"}
                        {step === "owner" && "Create your admin account"}
                        {step === "invite" && "Invite your team"}
                        {step === "complete" && "You're all set!"}
                    </p>
                </div>

                <div className="mb-8 flex justify-center gap-2">
                    {["organization", "owner", "invite", "complete"].map((s, i) => (
                        <div
                            key={s}
                            className={`h-2 w-12 rounded-full transition-colors ${
                                i <= ["organization", "owner", "invite", "complete"].indexOf(step)
                                    ? "bg-primary"
                                    : "bg-muted"
                            }`}
                        />
                    ))}
                </div>

                {step === "organization" && (
                    <SetupOrganization onComplete={handleOrganizationComplete} />
                )}
                {step === "owner" && (
                    <SetupOwner
                        organizationName={data.organization?.name || ""}
                        onComplete={handleOwnerComplete}
                    />
                )}
                {step === "invite" && (
                    <SetupInvite onComplete={handleInviteComplete} onSkip={handleSkipInvite} />
                )}
                {step === "complete" && (
                    <SetupComplete
                        organizationName={data.organization?.name || ""}
                        onComplete={handleSetupComplete}
                    />
                )}
            </div>
        </div>
    );
}
