import {
    boolean,
    index,
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    varchar
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { users } from "./users";

export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted", "expired"]);
export const joinRequestStatusEnum = pgEnum("join_request_status", [
    "pending",
    "approved",
    "rejected"
]);

export const inviteLinks = pgTable("invite_links", {
    id: varchar("id", { length: 36 })
        .primaryKey()
        .$defaultFn(() => nanoid()),
    code: varchar("code", { length: 20 }).notNull().unique(),
    createdBy: varchar("created_by", { length: 36 })
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const emailInvites = pgTable(
    "email_invites",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .$defaultFn(() => nanoid()),
        email: varchar("email", { length: 255 }).notNull(),
        invitedBy: varchar("invited_by", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        token: varchar("token", { length: 64 }).notNull().unique(),
        status: inviteStatusEnum("status").notNull().default("pending"),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [index("email_invites_email_idx").on(table.email)]
);

export const joinRequests = pgTable("join_requests", {
    id: varchar("id", { length: 36 })
        .primaryKey()
        .$defaultFn(() => nanoid()),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    message: text("message"),
    status: joinRequestStatusEnum("status").notNull().default("pending"),
    reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id, {
        onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export type InviteLink = typeof inviteLinks.$inferSelect;
export type NewInviteLink = typeof inviteLinks.$inferInsert;
export type EmailInvite = typeof emailInvites.$inferSelect;
export type NewEmailInvite = typeof emailInvites.$inferInsert;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type NewJoinRequest = typeof joinRequests.$inferInsert;
