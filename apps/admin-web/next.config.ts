import path from "node:path";
import type { NextConfig } from "next";

const skipBuildValidation = process.env.SKIP_NEXT_VALIDATION === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ["pg", "ioredis", "bullmq", "mongodb", "graphql"],
  eslint: {
    ignoreDuringBuilds: skipBuildValidation,
  },
  typescript: {
    ignoreBuildErrors: skipBuildValidation,
  },
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
