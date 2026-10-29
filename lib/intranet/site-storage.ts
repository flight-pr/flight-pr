import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { MEDIA_ORIGIN } from "@/lib/site-origins";
import { ApiError } from "./server";
export function siteStorageConfigured() { return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_SITE_ACCESS_KEY_ID && process.env.R2_SITE_SECRET_ACCESS_KEY && process.env.R2_SITE_BUCKET); }
export function siteStorage() {
  if (!siteStorageConfigured()) throw new ApiError(503, "Lo storage delle immagini non è ancora collegato. Configura le credenziali del bucket del sito.");
  return new S3Client({ region: "auto", endpoint: process.env.R2_SITE_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, forcePathStyle: true, credentials: { accessKeyId: process.env.R2_SITE_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SITE_SECRET_ACCESS_KEY! }, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
}
export function siteMediaOrigin() { return (process.env.SITE_ASSETS_URL || MEDIA_ORIGIN).replace(/\/$/, ""); }
