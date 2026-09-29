import type { NextConfig } from "next";

// Styling note: Carbon's SCSS is compiled by the Sass CLI (`npm run css`,
// wired into `dev` and `prebuild`) into src/app/globals.css, which the
// root layout imports as plain CSS. Next's built-in Sass importer can't
// resolve Carbon's internal imports on Windows, so Sass is kept out of
// the Next pipeline entirely.
const nextConfig: NextConfig = {
  // Keep the dev indicator clear of the mobile navigation bar.
  devIndicators: { position: "top-right" },
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
