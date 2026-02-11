import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { accounts } from "./accounts";

describe("accounts schema", () => {
    it("has a unique constraint on (providerId, accountId)", () => {
        const config = getTableConfig(accounts);
        const constraint = config.uniqueConstraints.find(
            (uc) => uc.name === "accounts_provider_account_unique"
        );

        expect(constraint).toBeDefined();
        expect(constraint!.columns.map((c) => c.name)).toEqual(["provider_id", "account_id"]);
    });

    it("prevents duplicate OAuth accounts from the same provider", () => {
        // Verify the constraint exists at the schema level — the actual DB
        // enforcement is handled by PostgreSQL, but this ensures the migration
        // will include the constraint.
        const config = getTableConfig(accounts);
        const uniqueNames = config.uniqueConstraints.map((uc) => uc.name);
        expect(uniqueNames).toContain("accounts_provider_account_unique");
    });
});
