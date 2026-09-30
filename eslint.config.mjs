import path from "node:path";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: path.join(import.meta.dirname, "apps/web") },
      react: { version: "19" },
    },
  },
  prettier,
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/next-env.d.ts",
    "packages/db/src/prisma/contract.d.ts",
    "packages/db/migrations/**",
    "apps/web/public/embed.js",
  ]),
]);
