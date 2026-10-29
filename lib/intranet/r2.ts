import "server-only";
import { S3Client, AbortMultipartUploadCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createHash, randomBytes } from "node:crypto";
import { ApiError, adminDb, dbError } from "./server";
import type { Transfer, TransferFile } from "./types";
export function r2Configured() { return Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET); }
export function r2() {
  if (!r2Configured()) throw new ApiError(503, "Cloudflare R2 non è ancora configurato.");
  return new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! }, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
}
export function bucket() { return process.env.R2_BUCKET!; }
export function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function newToken() { return randomBytes(32).toString("base64url"); }
export async function publicTransfer(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { data, error } = await adminDb().from("transfers").select("*, transfer_files(*)").eq("token_hash", tokenHash(token)).eq("status", "ready").gt("expires_at", new Date().toISOString()).maybeSingle();
  dbError(error);
  return data as Transfer | null;
}
export async function purgeTransfer(transfer: Transfer) {
  // Invalidate the sharing link before touching storage. Retries also delete objects
  // completed by an upload that was already in flight at revocation time.
  const db = adminDb();
  const expired = new Date(transfer.expires_at).getTime() <= Date.now();
  const revokedAt = transfer.revoked_at || new Date().toISOString();
  const { error } = await db.from("transfers").update({ status: expired ? "expired" : "revoked", ...(!expired ? { revoked_at: revokedAt } : {}), purged_at: null }).eq("id", transfer.id);
  dbError(error);
  const store = r2();
  for (const file of transfer.transfer_files as TransferFile[]) {
    if (!file.key) continue;
    if (file.upload_id) {
      try { await store.send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: file.key, UploadId: file.upload_id })); }
      catch (error) { if ((error as { name: string }).name !== "NoSuchUpload") throw error; }
    }
    await store.send(new DeleteObjectCommand({ Bucket: bucket(), Key: file.key }));
  }
  // Keep purged_at null until a later cleanup, after all 15-minute signed upload
  // URLs and in-flight completions have expired, to catch late writes.
  const closedAt = expired ? new Date(transfer.expires_at).getTime() : new Date(revokedAt).getTime();
  if (Date.now() - closedAt > 60 * 60 * 1000) {
    if (transfer.deleted_at) {
      dbError((await db.from("transfers").delete().eq("id", transfer.id).eq("deleted_at", transfer.deleted_at)).error);
    } else {
      // A concurrent delete must remain eligible for the cleanup job.
      const { error: markError } = await db.from("transfers").update({ purged_at: new Date().toISOString() }).eq("id", transfer.id).is("deleted_at", null);
      dbError(markError);
    }
  }
}
