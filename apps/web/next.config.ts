import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@marshaldesk/shared", "@marshaldesk/db"],
  serverExternalPackages: ["@prisma/orm-postgres", "pg"],
};

export default nextConfig;
