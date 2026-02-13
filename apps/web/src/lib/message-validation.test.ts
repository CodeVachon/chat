import { describe, expect, it } from "vitest";

import { validateMessageContext } from "./message-validation";

describe("validateMessageContext", () => {
    it("accepts message with channelId only", () => {
        expect(validateMessageContext({ channelId: "ch1" })).toEqual({ valid: true });
    });

    it("accepts message with conversationId only", () => {
        expect(validateMessageContext({ conversationId: "conv1" })).toEqual({ valid: true });
    });

    it("rejects message with both channelId and conversationId", () => {
        const result = validateMessageContext({ channelId: "ch1", conversationId: "conv1" });
        expect(result).toEqual({
            valid: false,
            error: "Message cannot belong to both a channel and conversation"
        });
    });

    it("accepts message with neither (route path provides context)", () => {
        // Routes always set the context from the URL path, so an empty body is valid
        expect(validateMessageContext({})).toEqual({ valid: true });
    });
});
