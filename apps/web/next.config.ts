import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["pg", "pg-native", "better-auth"],
    transpilePackages: ["@chat/db", "@chat/events"]
};

export default nextConfig;
