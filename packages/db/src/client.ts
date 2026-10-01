import "temporal-polyfill/global";
import pgvector from "@prisma/orm-extension-pgvector/runtime";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./prisma/contract.d";
import contractJson from "./prisma/contract.json" with { type: "json" };

function createDb() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. @marshaldesk/db needs the pooled Neon connection string.",
    );
  }
  return postgres<Contract>({ contractJson, url, extensions: [pgvector] });
}

export type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as typeof globalThis & { marshaldeskDb?: Db };

export function getDb(): Db {
  globalForDb.marshaldeskDb ??= createDb();
  return globalForDb.marshaldeskDb;
}
