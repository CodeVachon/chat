import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Re-import a fresh module each test to pick up env changes
async function importFresh() {
    return await import("./index.js");
}

describe("buildPoolConfig", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it("uses default max of 20 when DB_POOL_MAX is not set", async () => {
        delete process.env.DB_POOL_MAX;
        const { buildPoolConfig } = await importFresh();
        const config = buildPoolConfig();
        expect(config.max).toBe(20);
    });

    it("respects DB_POOL_MAX environment variable", async () => {
        process.env.DB_POOL_MAX = "50";
        const { buildPoolConfig } = await importFresh();
        const config = buildPoolConfig();
        expect(config.max).toBe(50);
    });

    it("sets idleTimeoutMillis to 30 seconds", async () => {
        const { buildPoolConfig } = await importFresh();
        const config = buildPoolConfig();
        expect(config.idleTimeoutMillis).toBe(30_000);
    });

    it("sets connectionTimeoutMillis to 5 seconds", async () => {
        const { buildPoolConfig } = await importFresh();
        const config = buildPoolConfig();
        expect(config.connectionTimeoutMillis).toBe(5_000);
    });

    it("does not include ssl in non-production", async () => {
        process.env.NODE_ENV = "development";
        const { buildPoolConfig } = await importFresh();
        const config = buildPoolConfig();
        expect(config.ssl).toBeUndefined();
    });

    it("includes ssl config in production", async () => {
        process.env.NODE_ENV = "production";
        const { buildPoolConfig } = await importFresh();
        const config = buildPoolConfig();
        expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });

    it("passes through DATABASE_URL as connectionString", async () => {
        process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
        const { buildPoolConfig } = await importFresh();
        const config = buildPoolConfig();
        expect(config.connectionString).toBe("postgresql://user:pass@host:5432/db");
    });
});
