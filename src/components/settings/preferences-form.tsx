"use client";

import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { usePreferences } from "@/hooks/use-preferences";
import type { DateFormat, TimeFormat } from "@/lib/format-date";

import { ColorPicker } from "./color-picker";

const dateFormatOptions: { value: DateFormat; label: string }[] = [
    { value: "relative", label: "Relative" },
    { value: "MM/dd/yyyy", label: "MM/DD/YYYY" },
    { value: "dd/MM/yyyy", label: "DD/MM/YYYY" },
    { value: "yyyy-MM-dd", label: "YYYY-MM-DD" },
    { value: "MMM d, yyyy", label: "MMM D, YYYY" }
];

const timeFormatOptions: { value: TimeFormat; label: string }[] = [
    { value: "12h", label: "12-hour" },
    { value: "24h", label: "24-hour" }
];

function getDatePreview(dateFormat: DateFormat): string {
    const now = new Date();
    if (dateFormat === "relative") return "2 hours ago";
    return format(now, dateFormat);
}

function getTimePreview(timeFormat: TimeFormat): string {
    const now = new Date();
    return format(now, timeFormat === "12h" ? "h:mm a" : "HH:mm");
}

export function PreferencesForm() {
    const { preferences, updatePreferences } = usePreferences();

    return (
        <div className="space-y-6">
            {/* Appearance */}
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Theme</Label>
                        <Select
                            value={preferences.theme}
                            onValueChange={(value) =>
                                value &&
                                updatePreferences({
                                    theme: value as "light" | "dark" | "system"
                                })
                            }
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <ColorPicker
                            value={preferences.primaryColor}
                            onChange={(color) => updatePreferences({ primaryColor: color })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
                <CardHeader>
                    <CardTitle>Date & Time</CardTitle>
                    <CardDescription>Choose how dates and times are displayed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Date Format</Label>
                        <Select
                            value={preferences.dateFormat}
                            onValueChange={(value) =>
                                value && updatePreferences({ dateFormat: value as DateFormat })
                            }
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {dateFormatOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground text-xs">
                            Preview: {getDatePreview(preferences.dateFormat)}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Time Format</Label>
                        <Select
                            value={preferences.timeFormat}
                            onValueChange={(value) =>
                                value && updatePreferences({ timeFormat: value as TimeFormat })
                            }
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {timeFormatOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground text-xs">
                            Preview: {getTimePreview(preferences.timeFormat)}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
