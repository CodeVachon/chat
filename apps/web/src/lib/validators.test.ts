import { describe, expect, it } from "vitest";

import { validateEmoji, validateTransferOwnership } from "./validators";

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

describe("validateTransferOwnership", () => {
    const baseParams = {
        newOwnerId: "user-2",
        currentOwnerId: "user-1",
        actorId: "user-1",
        actorOrgRole: "member",
        isNewOwnerMember: true
    };

    it("returns null for a valid transfer by channel owner", () => {
        expect(validateTransferOwnership(baseParams)).toBeNull();
    });

    it("returns null for a valid transfer by org owner", () => {
        expect(
            validateTransferOwnership({
                ...baseParams,
                actorId: "user-3", // not the channel owner
                actorOrgRole: "owner"
            })
        ).toBeNull();
    });

    it("returns null for a valid transfer by org admin", () => {
        expect(
            validateTransferOwnership({
                ...baseParams,
                actorId: "user-3",
                actorOrgRole: "admin"
            })
        ).toBeNull();
    });

    it("returns error when newOwnerId is missing", () => {
        expect(
            validateTransferOwnership({
                ...baseParams,
                newOwnerId: undefined
            })
        ).toBe("newOwnerId is required");
    });

    it("returns error when newOwnerId is not a string", () => {
        expect(
            validateTransferOwnership({
                ...baseParams,
                newOwnerId: 42
            })
        ).toBe("newOwnerId is required");
    });

    it("returns error when a regular member tries to transfer", () => {
        expect(
            validateTransferOwnership({
                ...baseParams,
                actorId: "user-3", // not the channel owner
                actorOrgRole: "member"
            })
        ).toBe("Forbidden");
    });

    it("returns error when transferring to the current owner", () => {
        expect(
            validateTransferOwnership({
                ...baseParams,
                newOwnerId: "user-1" // same as currentOwnerId
            })
        ).toBe("New owner must be a different user");
    });

    it("returns error when new owner is not a channel member", () => {
        expect(
            validateTransferOwnership({
                ...baseParams,
                isNewOwnerMember: false
            })
        ).toBe("New owner must be a member of the channel");
    });
});
