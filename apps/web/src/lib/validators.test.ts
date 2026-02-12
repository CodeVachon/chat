import { describe, expect, it } from "vitest";

import { validateEmoji } from "./validators";

describe("validateEmoji", () => {
    it("returns null for a valid single emoji", () => {
        expect(validateEmoji("👍")).toBeNull();
    });

    it("returns null for a valid emoji string within 50 chars", () => {
        expect(validateEmoji("🎉")).toBeNull();
        expect(validateEmoji("❤️")).toBeNull();
        expect(validateEmoji("+1")).toBeNull();
    });

    it("returns null for a string at exactly 50 characters", () => {
        const fiftyChars = "a".repeat(50);
        expect(validateEmoji(fiftyChars)).toBeNull();
    });

    it("returns error for an empty string", () => {
        expect(validateEmoji("")).toBe("Emoji is required");
    });

    it("returns error for a whitespace-only string", () => {
        expect(validateEmoji("   ")).toBe("Emoji is required");
    });

    it("returns error for null", () => {
        expect(validateEmoji(null)).toBe("Emoji is required");
    });

    it("returns error for undefined", () => {
        expect(validateEmoji(undefined)).toBe("Emoji is required");
    });

    it("returns error for a non-string value", () => {
        expect(validateEmoji(42)).toBe("Emoji is required");
        expect(validateEmoji(true)).toBe("Emoji is required");
        expect(validateEmoji({})).toBe("Emoji is required");
    });

    it("returns error for a string exceeding 50 characters", () => {
        const longString = "a".repeat(51);
        expect(validateEmoji(longString)).toBe("Emoji must be 50 characters or less");
    });

    it("returns error for a very long string", () => {
        const veryLong = "🎉".repeat(100);
        expect(validateEmoji(veryLong)).toBe("Emoji must be 50 characters or less");
    });
});
