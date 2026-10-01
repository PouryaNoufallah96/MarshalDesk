import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
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
const bucket = requireEnv("STORAGE_PROFILE_IMAGES_BUCKET");

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

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ["PUT", "GET", "HEAD"],
          AllowedHeaders: ["Content-Type", "Cache-Control", "x-amz-*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  }),
);

const { CORSRules } = await client.send(
  new GetBucketCorsCommand({ Bucket: bucket }),
);
console.log(`CORS rules on ${bucket}:`);
console.log(JSON.stringify(CORSRules, null, 2));
