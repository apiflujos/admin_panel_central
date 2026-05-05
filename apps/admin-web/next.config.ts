import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["pg", "ioredis", "bullmq", "mongodb", "graphql"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
