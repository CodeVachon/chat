/**
 * Validate that a message creation request has valid context.
 * A message must belong to either a channel or a conversation, not both.
 */
export function validateMessageContext(body: {
    channelId?: string;
    conversationId?: string;
}): { valid: true } | { valid: false; error: string } {
    if (body.channelId && body.conversationId) {
        return { valid: false, error: "Message cannot belong to both a channel and conversation" };
    }
    return { valid: true };
}
