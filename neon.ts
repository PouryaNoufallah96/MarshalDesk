import { defineConfig } from "@neon/config/v1";

// Function env is baked in at deploy time; load it with
// `neon deploy --env apps/web/.env.local`.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Deploy with --env apps/web/.env.local.`,
    );
  }
  return value;
}

const uploadsBucket = process.env["STORAGE_UPLOADS_BUCKET"] ?? "uploads";

export default defineConfig({
  functions: {
    jobs: {
      name: "MarshalDesk jobs",
      source: "./apps/functions/src/index.ts",
      env: {
        FUNCTIONS_SECRET: requireEnv("FUNCTIONS_SECRET"),
        REALTIME_URL: requireEnv("REALTIME_URL"),
        REALTIME_PUBLISH_SECRET: requireEnv("REALTIME_PUBLISH_SECRET"),
        STORAGE_UPLOADS_BUCKET: uploadsBucket,
      },
      dev: { port: 8788 },
    },
  },
  buckets: {
    [uploadsBucket]: {},
  },
  triggers: {
    "source-uploaded": {
      type: "storage_object_created",
      function: "jobs",
      bucket: uploadsBucket,
      prefix: "workspaces/",
      functionPath: "/triggers/source-uploaded",
    },
    "auto-close": {
      type: "schedule",
      function: "jobs",
      cron: "*/15 * * * *",
      functionPath: "/triggers/auto-close",
    },
  },
});
