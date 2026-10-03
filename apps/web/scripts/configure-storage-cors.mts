import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
  type CORSRule,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

const origins = [
  ...new Set([
    new URL(requireEnv("NEXT_PUBLIC_APP_URL")).origin,
    ...process.argv.slice(2).map((origin) => new URL(origin).origin),
  ]),
];

const buckets: { name: string; rule: CORSRule }[] = [
  {
    name: requireEnv("STORAGE_PROFILE_IMAGES_BUCKET"),
    rule: {
      AllowedOrigins: origins,
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["Content-Type", "Cache-Control", "x-amz-*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3000,
    },
  },
  {
    name: requireEnv("STORAGE_UPLOADS_BUCKET"),
    rule: {
      AllowedOrigins: origins,
      AllowedMethods: ["PUT"],
      AllowedHeaders: ["Content-Type", "x-amz-*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3000,
    },
  },
];

const client = new S3Client({
  region: requireEnv("AWS_REGION"),
  endpoint: requireEnv("AWS_ENDPOINT_URL_S3"),
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

let failed = false;
for (const bucket of buckets) {
  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket.name,
        CORSConfiguration: { CORSRules: [bucket.rule] },
      }),
    );
  } catch (error) {
    failed = true;
    // A bucket inherited from a parent branch can be read here but only
    // configured on the branch that created it.
    console.error(
      `Couldn't set CORS on ${bucket.name}: ${error instanceof Error ? error.message : String(error)}. If the bucket was created on a parent branch, run this script against that branch.`,
    );
  }
  const { CORSRules } = await client.send(
    new GetBucketCorsCommand({ Bucket: bucket.name }),
  );
  console.log(`CORS rules on ${bucket.name}:`);
  console.log(JSON.stringify(CORSRules, null, 2));
}
if (failed) process.exitCode = 1;
