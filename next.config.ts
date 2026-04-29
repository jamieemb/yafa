import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's runtime and the better-sqlite3 native binding must not be
  // bundled by Next — they need to be `require`d from node_modules at
  // runtime so the .node binary loads correctly.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
  ],
};

export default nextConfig;
