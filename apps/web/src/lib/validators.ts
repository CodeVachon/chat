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

/**
 * Validate a channel ownership transfer request.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateTransferOwnership(params: {
    newOwnerId: unknown;
    currentOwnerId: string;
    actorId: string;
    actorOrgRole: string;
    isNewOwnerMember: boolean;
}): string | null {
    const { newOwnerId, currentOwnerId, actorId, actorOrgRole, isNewOwnerMember } = params;

    if (!newOwnerId || typeof newOwnerId !== "string") {
        return "newOwnerId is required";
    }

    // Only the current owner or org owner/admin can transfer
    const isChannelOwner = currentOwnerId === actorId;
    const isOrgAdmin = actorOrgRole === "owner" || actorOrgRole === "admin";
    if (!isChannelOwner && !isOrgAdmin) {
        return "Forbidden";
    }

    if (newOwnerId === currentOwnerId) {
        return "New owner must be a different user";
    }

    if (!isNewOwnerMember) {
        return "New owner must be a member of the channel";
    }

    return null;
}
