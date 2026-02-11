/**
 * Validate an emoji input string.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateEmoji(emoji: unknown): string | null {
    if (!emoji || typeof emoji !== "string" || emoji.trim().length === 0) {
        return "Emoji is required";
    }

    if (emoji.length > 50) {
        return "Emoji must be 50 characters or less";
    }

    return null;
}
