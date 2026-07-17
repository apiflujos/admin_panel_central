import path from "node:path";
import type { NextConfig } from "next";

// ESLint + TypeScript validation is enforced via the dedicated `lint` and
// `typecheck:admin-web` scripts, and the production Docker build always sets
// SKIP_NEXT_VALIDATION=1. Skip validation during `next build` by default so local
// builds succeed on every platform (Windows checkouts use CRLF, which the
// prettier/prettier rule rejects and would otherwise abort the build, leaving no
// .next output and breaking server startup). Opt back in with NEXT_BUILD_VALIDATION=1.
const skipBuildValidation =
  process.env.NEXT_BUILD_VALIDATION !== "1" || process.env.SKIP_NEXT_VALIDATION === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The admin-web runs as a middleware inside the Express backend, so we use
  // the standard Next.js build instead of the standalone server.
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
