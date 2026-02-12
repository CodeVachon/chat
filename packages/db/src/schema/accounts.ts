import { pgTable, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

import { users } from "./users";

export const accounts = pgTable(
    "accounts",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .$defaultFn(() => nanoid()),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        accountId: text("account_id").notNull(),
        providerId: varchar("provider_id", { length: 50 }).notNull(),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
        scope: text("scope"),
        idToken: text("id_token"),
        password: text("password"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
    },
    (table) => [unique("accounts_provider_account_unique").on(table.providerId, table.accountId)]
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
