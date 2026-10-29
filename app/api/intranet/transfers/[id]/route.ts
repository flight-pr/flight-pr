import { CompleteMultipartUploadCommand, HeadObjectCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { adminDb, ApiError, apiError, checkOrigin, dbError, json, requireStaff } from "@/lib/intranet/server";
import { bucket, newToken, purgeTransfer, r2, tokenHash } from "@/lib/intranet/r2";
import { openTransferToken, sealTransferToken } from "@/lib/intranet/transfer-token";
import { uploadActionSchema } from "@/lib/intranet/validation";
import { PART_SIZE, type Transfer, type TransferFile } from "@/lib/intranet/types";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    await requireStaff();
    const id = z.uuid().parse((await context.params).id);
    const { data, error } = await adminDb().from("transfers").select("id,status,expires_at,token_hash,token_ciphertext").eq("id", id).maybeSingle();
    dbError(error);
    if (!data) throw new ApiError(404, "Trasferimento non trovato.");
    if (["revoked", "expired"].includes(data.status) || new Date(data.expires_at).getTime() <= Date.now()) throw new ApiError(410, "Questo trasferimento è scaduto o revocato.");
    if (data.status !== "ready") throw new ApiError(409, "Attendi il completamento del trasferimento.");
    if (!data.token_ciphertext) throw new ApiError(409, "Questo trasferimento usa un link della versione precedente. Premi “Genera nuovo link” una sola volta; poi potrai copiarlo senza modificarlo.");
    let token: string;
    try {
      token = openTransferToken(data.token_ciphertext, id, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      if (!/^[A-Za-z0-9_-]{43}$/.test(token) || tokenHash(token) !== data.token_hash) throw new Error("Token mismatch");
    } catch { throw new ApiError(409, "Il link salvato non è recuperabile. Premi “Genera nuovo link” per crearne uno nuovo."); }
    return json({ token });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request); await requireStaff();
    const id = z.uuid().parse((await context.params).id);
    const input = uploadActionSchema.parse(await request.json());
    const db = adminDb();
    const { data, error } = await db.from("transfers").select("*, transfer_files(*)").eq("id", id).maybeSingle();
    dbError(error); if (!data) throw new ApiError(404, "Trasferimento non trovato.");
    const transfer = data as Transfer;
    if (input.action === "revoke") {
      // Revoke access even when R2 is unavailable. Storage cleanup is retried by cron.
      const revokedAt = transfer.revoked_at || new Date().toISOString();
      dbError((await db.from("transfers").update({ status: "revoked", revoked_at: revokedAt, purged_at: null }).eq("id", id)).error);
      try { await purgeTransfer({ ...transfer, revoked_at: revokedAt }); return json({ ok: true, cleanupPending: false }); }
      catch { return json({ ok: true, cleanupPending: true }); }
    }
    if (["revoked", "expired"].includes(transfer.status) || new Date(transfer.expires_at).getTime() <= Date.now()) throw new ApiError(410, "Questo trasferimento è scaduto o revocato.");
    if (input.action === "share") {
      if (transfer.status !== "ready") throw new ApiError(409, "Attendi il completamento del trasferimento.");
      const token = newToken(); dbError((await db.from("transfers").update({ token_hash: tokenHash(token), token_ciphertext: sealTransferToken(token, id, process.env.SUPABASE_SERVICE_ROLE_KEY!) }).eq("id", id).eq("status", "ready").gt("expires_at", new Date().toISOString()).select("id").single()).error);
      return json({ token });
    }
    if (transfer.status !== "uploading") throw new ApiError(409, "Il trasferimento è già completo.");
    const store = r2();
    if (input.action === "finish") {
      if (!transfer.transfer_files.length || transfer.transfer_files.some((f) => !f.completed)) throw new ApiError(409, "Completa tutti i file prima di condividere il link.");
      dbError((await db.from("transfers").update({ status: "ready" }).eq("id", id).eq("status", "uploading").gt("expires_at", new Date().toISOString()).select("id").single()).error);
      return json({ ok: true });
    }
    const file = transfer.transfer_files.find((f) => f.id === input.fileId) as TransferFile | undefined;
    if (!file?.key || !file.upload_id || file.completed) throw new ApiError(404, "Caricamento non disponibile.");
    const count = Math.ceil(file.size / PART_SIZE);
    if (input.action === "sign") {
      if (input.partNumber > count) throw new ApiError(400, "Parte non valida.");
      const contentLength = Math.min(PART_SIZE, file.size - (input.partNumber - 1) * PART_SIZE);
      const url = await getSignedUrl(store, new UploadPartCommand({ Bucket: bucket(), Key: file.key, UploadId: file.upload_id, PartNumber: input.partNumber, ContentLength: contentLength }), { expiresIn: 900 });
      return json({ url });
    }
    const parts = [...input.parts].sort((a, b) => a.PartNumber - b.PartNumber);
    if (parts.length !== count || parts.some((p, i) => p.PartNumber !== i + 1)) throw new ApiError(400, "Elenco delle parti incompleto o non valido.");
    await store.send(new CompleteMultipartUploadCommand({ Bucket: bucket(), Key: file.key, UploadId: file.upload_id, MultipartUpload: { Parts: parts } }));
    const object = await store.send(new HeadObjectCommand({ Bucket: bucket(), Key: file.key }));
    if (object.ContentLength !== file.size) { await purgeTransfer(transfer); throw new ApiError(400, "La dimensione del file non corrisponde. Il trasferimento è stato annullato."); }
    dbError((await db.from("transfer_files").update({ completed: true }).eq("id", file.id)).error);
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request); await requireStaff();
    const id = z.uuid().parse((await context.params).id);
    const db = adminDb();
    const { data, error } = await db.from("transfers").select("*, transfer_files(*)").eq("id", id).maybeSingle();
    dbError(error);
    if (!data) throw new ApiError(404, "Trasferimento non trovato.");
    const transfer = data as Transfer;
    if (transfer.status !== "revoked" && !(transfer.status === "expired" && transfer.revoked_at)) throw new ApiError(409, "Revoca il trasferimento prima di eliminarlo.");
    // Discard storage keys only after cleanup and the in-flight upload grace period.
    if (transfer.purged_at) {
      const removed = await db.from("transfers").delete().eq("id", id).eq("status", transfer.status).select("id").single();
      dbError(removed.error);
      return json({ ok: true, cleanupPending: false });
    }
    const deletedAt = transfer.deleted_at || new Date().toISOString();
    const hidden = await db.from("transfers").update({ deleted_at: deletedAt }).eq("id", id).eq("status", transfer.status).select("id").single();
    dbError(hidden.error);
    let cleanupPending = true;
    try {
      await purgeTransfer({ ...transfer, deleted_at: deletedAt });
      const expiresAt = new Date(transfer.expires_at).getTime();
      const closedAt = expiresAt <= Date.now() ? expiresAt : new Date(transfer.revoked_at!).getTime();
      cleanupPending = Date.now() - closedAt <= 60 * 60 * 1000;
    } catch { /* Keep the tombstone and storage keys so scheduled cleanup can retry. */ }
    return json({ ok: true, cleanupPending });
  } catch (error) { return apiError(error); }
}
