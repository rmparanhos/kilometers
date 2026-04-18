import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling native / CJS-only packages
  serverExternalPackages: ["better-sqlite3", "garmin-connect", "adm-zip"],
};

export default nextConfig;
