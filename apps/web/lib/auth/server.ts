import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export const auth = createNeonAuth({
  baseUrl: requireEnv("NEON_AUTH_BASE_URL"),
  cookies: { secret: requireEnv("NEON_AUTH_COOKIE_SECRET") },
});
