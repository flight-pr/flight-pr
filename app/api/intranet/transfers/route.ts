import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { ApiError, adminDb, apiError, checkOrigin, dbError, json, requireStaff } from "@/lib/intranet/server";
import { bucket, newToken, purgeTransfer, r2, tokenHash } from "@/lib/intranet/r2";
import { sealTransferToken } from "@/lib/intranet/transfer-token";
import { transferSchema } from "@/lib/intranet/validation";
import { PART_SIZE, type Transfer } from "@/lib/intranet/types";
export async function POST(request: Request) {
  let createdId: string | undefined;
  try {
    checkOrigin(request);
    const { profile } = await requireStaff();
    const input = transferSchema.parse(await request.json());
    const store = r2(); const db = adminDb();
    const { count, error: countError } = await db.from("transfers").select("id", { count: "exact", head: true }).eq("created_by", profile.id).eq("status", "uploading");
    dbError(countError);
    if ((count || 0) >= 10) throw new ApiError(429, "Hai già 10 trasferimenti in corso. Annullane uno prima di continuare.");
    const token = newToken(); const id = randomUUID();
    const { title, recipient, message, contact_id, days, files } = input;
    const result = await db.from("transfers").insert({ id, title, recipient, message, contact_id, token_hash: tokenHash(token), token_ciphertext: sealTransferToken(token, id, process.env.SUPABASE_SERVICE_ROLE_KEY!), created_by: profile.id, expires_at: new Date(Date.now() + days * 86400000).toISOString() }).select().single();
    dbError(result.error); createdId = id;
    const fileRecords = [];
    for (const file of files) {
      const fileId = randomUUID(); const key = `transfers/${id}/${fileId}`;
      // Store the key before creating the multipart upload, so cleanup can always
      // discover a successfully created object even if a later DB write fails.
      const row = { id: fileId, transfer_id: id, key, ...file, type: "application/octet-stream", upload_id: null as string | null };
      dbError((await db.from("transfer_files").insert(row)).error);
      const upload = await store.send(new CreateMultipartUploadCommand({ Bucket: bucket(), Key: key, ContentType: "application/octet-stream" }));
      if (!upload.UploadId) throw new ApiError(502, "Impossibile inizializzare il caricamento su R2.");
      row.upload_id = upload.UploadId;
      const saved = await db.from("transfer_files").update({ upload_id: row.upload_id }).eq("id", fileId);
      if (saved.error) {
        const { AbortMultipartUploadCommand } = await import("@aws-sdk/client-s3");
        await store.send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: key, UploadId: upload.UploadId }));
        dbError(saved.error);
      }
      fileRecords.push({ id: fileId, name: file.name, size: file.size });
    }
    return json({ id, token, files: fileRecords, partSize: PART_SIZE }, 201);
  } catch (error) {
    if (createdId) {
      try { const { data } = await adminDb().from("transfers").select("*, transfer_files(*)").eq("id", createdId).single(); if (data) await purgeTransfer(data as Transfer); } catch { /* Scheduled cleanup retries. */ }
    }
    return apiError(error);
  }
}
