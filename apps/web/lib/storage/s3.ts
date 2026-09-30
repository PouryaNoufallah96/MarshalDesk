import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { requireEnv } from "./env";

let client: S3Client | undefined;

export function storageClient(): S3Client {
  client ??= new S3Client({
    region: requireEnv("AWS_REGION"),
    endpoint: requireEnv("AWS_ENDPOINT_URL_S3"),
    credentials: {
      accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
    // By default the presigner signs a checksum of the empty command body, so
    // every browser PUT with real bytes would fail the signature check.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}
