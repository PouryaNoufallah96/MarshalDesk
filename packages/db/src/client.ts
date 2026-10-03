import "temporal-polyfill/global";
import pgvector from "@prisma/orm-extension-pgvector/runtime";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./prisma/contract.d";
import contractJson from "./prisma/contract.json" with { type: "json" };

// pg already treats these as verify-full but warns that pg 9 will weaken them.
// Neon Functions inject DATABASE_URL with sslmode=require.
const VERIFY_FULL_ALIASES = new Set(["prefer", "require", "verify-ca"]);

function withExplicitSslMode(url: string): string {
  const parsed = new URL(url);
  const mode = parsed.searchParams.get("sslmode");
  if (
    mode &&
    VERIFY_FULL_ALIASES.has(mode) &&
    !parsed.searchParams.has("uselibpqcompat")
  ) {
    parsed.searchParams.set("sslmode", "verify-full");
  }
  return parsed.toString();
}

function createDb() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. @marshaldesk/db needs the pooled Neon connection string.",
    );
  }
  return postgres<Contract>({
    contractJson,
    url: withExplicitSslMode(url),
    extensions: [pgvector],
  });
}

export type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as typeof globalThis & { marshaldeskDb?: Db };

export function getDb(): Db {
  globalForDb.marshaldeskDb ??= createDb();
  return globalForDb.marshaldeskDb;
}
