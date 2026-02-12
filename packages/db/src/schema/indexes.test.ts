import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { emailInvites } from "./invites";
import { attachments, reactions } from "./messages";
import { sessions } from "./sessions";

/** Helper: return index names from a Drizzle table definition */
function getIndexNames(table: Parameters<typeof getTableConfig>[0]): (string | undefined)[] {
    return getTableConfig(table).indexes.map((i) => i.config.name);
}

/** Helper: return index column names for a given index */
function getIndexColumns(table: Parameters<typeof getTableConfig>[0], indexName: string): string[] {
    const idx = getTableConfig(table).indexes.find((i) => i.config.name === indexName);
    if (!idx) return [];
    return idx.config.columns
        .map((c) => ("name" in c ? (c.name as string) : undefined))
        .filter((name): name is string => name !== undefined);
}

describe("database indexes", () => {
    describe("reactions table", () => {
        it("has an index on messageId for efficient per-message lookups", () => {
            expect(getIndexNames(reactions)).toContain("reactions_message_idx");
        });

        it("reactions_message_idx covers the message_id column", () => {
            expect(getIndexColumns(reactions, "reactions_message_idx")).toEqual(["message_id"]);
        });
    });

    describe("attachments table", () => {
        it("has an index on messageId for efficient per-message lookups", () => {
            expect(getIndexNames(attachments)).toContain("attachments_message_idx");
        });

        it("attachments_message_idx covers the message_id column", () => {
            expect(getIndexColumns(attachments, "attachments_message_idx")).toEqual(["message_id"]);
        });
    });

    describe("sessions table", () => {
        it("has an index on userId for efficient session lookups by user", () => {
            expect(getIndexNames(sessions)).toContain("sessions_user_idx");
        });

        it("sessions_user_idx covers the user_id column", () => {
            expect(getIndexColumns(sessions, "sessions_user_idx")).toEqual(["user_id"]);
        });
    });

    describe("emailInvites table", () => {
        it("has an index on email for efficient invite lookups by email", () => {
            expect(getIndexNames(emailInvites)).toContain("email_invites_email_idx");
        });

        it("email_invites_email_idx covers the email column", () => {
            expect(getIndexColumns(emailInvites, "email_invites_email_idx")).toEqual(["email"]);
        });
    });
});
