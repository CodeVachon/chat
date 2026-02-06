import { index, pgEnum, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { users } from "./users";

export const conversationTypeEnum = pgEnum("conversation_type", ["dm"]);

export const conversations = pgTable("conversations", {
    id: varchar("id", { length: 36 })
        .primaryKey()
        .$defaultFn(() => nanoid()),
    type: conversationTypeEnum("type").notNull().default("dm"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const conversationParticipants = pgTable(
    "conversation_participants",
    {
        conversationId: varchar("conversation_id", { length: 36 })
            .notNull()
            .references(() => conversations.id, { onDelete: "cascade" }),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
        lastReadAt: timestamp("last_read_at", { withTimezone: true })
    },
    (table) => [
        primaryKey({ columns: [table.conversationId, table.userId] }),
        index("conversation_participants_user_idx").on(table.userId)
    ]
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type NewConversationParticipant = typeof conversationParticipants.$inferInsert;
