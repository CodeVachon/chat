import {
    boolean,
    index,
    pgEnum,
    pgTable,
    primaryKey,
    timestamp,
    varchar
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { users } from "./users";

export const channelRoleEnum = pgEnum("channel_role", ["owner", "admin", "member"]);

export const channels = pgTable(
    "channels",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .$defaultFn(() => nanoid()),
        name: varchar("name", { length: 80 }).notNull(),
        emoji: varchar("emoji", { length: 10 }),
        description: varchar("description", { length: 500 }),
        isPrivate: boolean("is_private").notNull().default(false),
        ownerId: varchar("owner_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        archivedAt: timestamp("archived_at", { withTimezone: true })
    },
    (table) => [index("channels_created_at_idx").on(table.id, table.createdAt)]
);

export const channelMembers = pgTable(
    "channel_members",
    {
        channelId: varchar("channel_id", { length: 36 })
            .notNull()
            .references(() => channels.id, { onDelete: "cascade" }),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: channelRoleEnum("role").notNull().default("member"),
        joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
        lastReadAt: timestamp("last_read_at", { withTimezone: true })
    },
    (table) => [
        primaryKey({ columns: [table.channelId, table.userId] }),
        index("channel_members_user_idx").on(table.userId)
    ]
);

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type ChannelMember = typeof channelMembers.$inferSelect;
export type NewChannelMember = typeof channelMembers.$inferInsert;
