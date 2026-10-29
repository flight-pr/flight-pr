import { timingSafeEqual } from "node:crypto";
import { adminDb, apiError, json } from "@/lib/intranet/server";
import { purgeTransfer } from "@/lib/intranet/r2";
import type { Transfer } from "@/lib/intranet/types";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return json({ error: "Non autorizzato" }, 401);
  try {
    const db = adminDb(); const now = new Date().toISOString(); const stale = new Date(Date.now() - 86400000).toISOString();
    const { data, error } = await db.from("transfers").select("*, transfer_files(*)").is("purged_at", null).or(`expires_at.lt.${now},status.eq.revoked,and(status.eq.uploading,created_at.lt.${stale})`).order("expires_at").limit(100);
    if (error) throw error;
    let cleaned = 0; let failed = 0;
    for (const transfer of data || []) { try { await purgeTransfer(transfer as Transfer); cleaned++; } catch { failed++; } }
    return json({ cleaned, failed }, failed ? 500 : 200);
  } catch (error) { return apiError(error); }
}
