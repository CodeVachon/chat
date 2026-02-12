import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "jsdom",
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        restoreMocks: true
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
            "@chat/events": resolve(__dirname, "../../packages/events/src/socket-events.ts")
        }
    }
});
