import {
    bigint,
    index,
    integer,
    pgTable,
    text,
    timestamp,
    unique,
    varchar
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { channels } from "./channels";
import { conversations } from "./conversations";
import { users } from "./users";

export const messages = pgTable(
    "messages",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .$defaultFn(() => nanoid()),
        content: text("content").notNull(),
        contentHtml: text("content_html"),
        channelId: varchar("channel_id", { length: 36 }).references(() => channels.id, {
            onDelete: "cascade"
        }),
        conversationId: varchar("conversation_id", { length: 36 }).references(
            () => conversations.id,
            {
                onDelete: "cascade"
            }
        ),
        authorId: varchar("author_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        parentId: varchar("parent_id", { length: 36 }),
        editedAt: timestamp("edited_at", { withTimezone: true }),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [
        index("messages_channel_created_idx").on(table.channelId, table.createdAt, table.id),
        index("messages_conversation_created_idx").on(
            table.conversationId,
            table.createdAt,
            table.id
        ),
        index("messages_author_created_idx").on(table.authorId, table.createdAt),
        index("messages_parent_idx").on(table.parentId)
    ]
);

export const reactions = pgTable(
    "reactions",
    {
        messageId: varchar("message_id", { length: 36 })
            .notNull()
            .references(() => messages.id, { onDelete: "cascade" }),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        emoji: varchar("emoji", { length: 50 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [
        unique("reactions_unique").on(table.messageId, table.userId, table.emoji),
        index("reactions_message_idx").on(table.messageId)
    ]
);

export const attachments = pgTable(
    "attachments",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .$defaultFn(() => nanoid()),
        messageId: varchar("message_id", { length: 36 })
            .notNull()
            .references(() => messages.id, { onDelete: "cascade" }),
        cloudinaryId: varchar("cloudinary_id", { length: 255 }).notNull(),
        url: text("url").notNull(),
        filename: varchar("filename", { length: 255 }).notNull(),
        mimeType: varchar("mime_type", { length: 100 }),
        size: bigint("size", { mode: "number" }),
        width: integer("width"),
        height: integer("height"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [index("attachments_message_idx").on(table.messageId)]
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
