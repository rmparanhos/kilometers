import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling better-sqlite3 (native .node binary)
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
