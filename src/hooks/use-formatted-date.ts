"use client";

import { useCallback } from "react";

import { formatDateOnly, formatMessageDate } from "@/lib/format-date";

import { usePreferences } from "./use-preferences";

export function useFormattedDate() {
    const { preferences } = usePreferences();

    const formatMessage = useCallback(
        (date: Date | string) => {
            return formatMessageDate(date, preferences.dateFormat, preferences.timeFormat);
        },
        [preferences.dateFormat, preferences.timeFormat]
    );

    const formatDate = useCallback(
        (date: Date | string) => {
            return formatDateOnly(date, preferences.dateFormat);
        },
        [preferences.dateFormat]
    );

    return { formatMessage, formatDate };
}
