import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["pg", "pg-native", "better-auth"]
};

export default nextConfig;
