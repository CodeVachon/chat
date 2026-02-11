import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolConfig } from "pg";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * Build a pg PoolConfig from environment variables.
 * Exported for testability.
 */
export function buildPoolConfig(): PoolConfig {
    return {
        connectionString: process.env.DATABASE_URL,
        max: parseInt(process.env.DB_POOL_MAX || "20", 10),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        ...(process.env.NODE_ENV === "production" && {
            ssl: { rejectUnauthorized: false }
        })
    };
}

const pool = new Pool(buildPoolConfig());

export const db = drizzle(pool, { schema });

export type Database = typeof db;
