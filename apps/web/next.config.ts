import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@marshaldesk/shared", "@marshaldesk/db"],
  serverExternalPackages: ["@prisma/orm-postgres", "pg"],
  async headers() {
    return [
      {
        // Customers paste a fixed URL, so updates must reach them quickly.
        source: "/embed.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
