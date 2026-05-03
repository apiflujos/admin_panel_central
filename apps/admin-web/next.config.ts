import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    externalDir: true,
    serverExternalPackages: ["pg", "ioredis", "bullmq", "mongodb", "graphql"],
  },
};

export default nextConfig;
