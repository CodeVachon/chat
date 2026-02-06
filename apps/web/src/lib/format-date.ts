import { format, formatDistanceToNow } from "date-fns";

export type DateFormat = "relative" | "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd" | "MMM d, yyyy";
export type TimeFormat = "12h" | "24h";

const timePatterns: Record<TimeFormat, string> = {
    "12h": "h:mm a",
    "24h": "HH:mm"
};

export function formatMessageDate(
    date: Date | string,
    dateFormat: DateFormat = "relative",
    timeFormat: TimeFormat = "12h"
): string {
    const d = typeof date === "string" ? new Date(date) : date;

    if (dateFormat === "relative") {
        return formatDistanceToNow(d, { addSuffix: true });
    }

    return `${format(d, dateFormat)} ${format(d, timePatterns[timeFormat])}`;
}

export function formatDateOnly(date: Date | string, dateFormat: DateFormat = "relative"): string {
    const d = typeof date === "string" ? new Date(date) : date;

    if (dateFormat === "relative") {
        return formatDistanceToNow(d, { addSuffix: true });
    }

    return format(d, dateFormat);
}
