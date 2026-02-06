import { boolean, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);
export const userStatusEnum = pgEnum("user_status", ["online", "away", "dnd", "offline"]);

export const users = pgTable("users", {
    id: varchar("id", { length: 36 })
        .primaryKey()
        .$defaultFn(() => nanoid()),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    image: text("image"), // better-auth expects 'image' not 'avatarUrl'
    emailVerified: boolean("email_verified").notNull().default(false), // better-auth expects boolean
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // Custom fields
    orgRole: orgRoleEnum("org_role").notNull().default("member"),
    status: userStatusEnum("status").notNull().default("offline"),
    statusMessage: varchar("status_message", { length: 255 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
