import "dotenv/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import { definePrismaConfig } from "prisma/config";

const connection = process.env["DATABASE_URL_UNPOOLED"];

export default definePrismaConfig({
  parent: false,
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    migrations: { dir: "./migrations" },
    ...(connection ? { db: { connection } } : {}),
  }),
  skills: {
    check: false,
  },
});
