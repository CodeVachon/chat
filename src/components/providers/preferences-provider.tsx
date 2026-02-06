"use client";

import { useTheme } from "next-themes";
import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import type { DateFormat, TimeFormat } from "@/lib/format-date";

import { useSession } from "./auth-provider";

export interface Preferences {
    theme: "light" | "dark" | "system";
    primaryColor: string;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
}

interface PreferencesContextType {
    preferences: Preferences;
    isLoading: boolean;
    updatePreferences: (updates: Partial<Preferences>) => Promise<void>;
}

const defaults: Preferences = {
    theme: "system",
    primaryColor: "oklch(0.61 0.11 222)",
    dateFormat: "relative",
    timeFormat: "12h"
};

export const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const { data: session } = useSession();
    const { setTheme } = useTheme();
    const [preferences, setPreferences] = useState<Preferences>(defaults);
    const [isLoading, setIsLoading] = useState(true);
    const hasFetched = useRef(false);

    // Apply primary color to document
    const applyPrimaryColor = useCallback((color: string) => {
        document.documentElement.style.setProperty("--primary-base", color);
    }, []);

    // Fetch preferences when session is available
    useEffect(() => {
        if (!session?.user || hasFetched.current) return;
        hasFetched.current = true;

        const fetchPreferences = async () => {
            try {
                const response = await fetch("/api/preferences");
                if (response.ok) {
                    const data = await response.json();
                    const prefs: Preferences = {
                        theme: data.theme || defaults.theme,
                        primaryColor: data.primaryColor || defaults.primaryColor,
                        dateFormat: data.dateFormat || defaults.dateFormat,
                        timeFormat: data.timeFormat || defaults.timeFormat
                    };
                    setPreferences(prefs);
                    setTheme(prefs.theme);
                    applyPrimaryColor(prefs.primaryColor);
                }
            } catch (error) {
                console.error("Failed to fetch preferences:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPreferences();
    }, [session, setTheme, applyPrimaryColor]);

    // If no session, stop loading
    useEffect(() => {
        if (!session?.user) {
            setIsLoading(false);
        }
    }, [session]);

    const updatePreferences = useCallback(
        async (updates: Partial<Preferences>) => {
            const newPrefs = { ...preferences, ...updates };
            setPreferences(newPrefs);

            // Apply immediately
            if (updates.theme) {
                setTheme(updates.theme);
            }
            if (updates.primaryColor) {
                applyPrimaryColor(updates.primaryColor);
            }

            // Persist to DB
            try {
                await fetch("/api/preferences", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updates)
                });
            } catch (error) {
                console.error("Failed to save preferences:", error);
            }
        },
        [preferences, setTheme, applyPrimaryColor]
    );

    return (
        <PreferencesContext.Provider value={{ preferences, isLoading, updatePreferences }}>
            {children}
        </PreferencesContext.Provider>
    );
}
