import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

import { users } from "./users";

export const userPreferences = pgTable("user_preferences", {
    userId: varchar("user_id", { length: 36 })
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    theme: varchar("theme", { length: 10 }).notNull().default("system"),
    primaryColor: varchar("primary_color", { length: 50 })
        .notNull()
        .default("oklch(0.61 0.11 222)"),
    dateFormat: varchar("date_format", { length: 20 }).notNull().default("relative"),
    timeFormat: varchar("time_format", { length: 5 }).notNull().default("12h"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
