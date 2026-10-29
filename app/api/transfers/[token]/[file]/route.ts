import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { apiError, ApiError } from "@/lib/intranet/server";
import { bucket, publicTransfer, r2 } from "@/lib/intranet/r2";
export async function GET(_request: Request, context: { params: Promise<{ token: string; file: string }> }) {
  try {
    const { token, file: fileId } = await context.params;
    const transfer = await publicTransfer(token);
    const file = transfer?.transfer_files.find((f) => f.id === fileId && f.completed);
    if (!transfer || !file?.key) throw new ApiError(404, "Link scaduto, revocato o non disponibile.");
    const ttl = Math.max(1, Math.min(60, Math.floor((new Date(transfer.expires_at).getTime() - Date.now()) / 1000)));
    const ascii = file.name.replace(/[^a-zA-Z0-9._ -]/g, "_");
    const filename = encodeURIComponent(file.name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    const url = await getSignedUrl(r2(), new GetObjectCommand({ Bucket: bucket(), Key: file.key, ResponseContentDisposition: `attachment; filename="${ascii}"; filename*=UTF-8''${filename}`, ResponseContentType: "application/octet-stream" }), { expiresIn: ttl });
    const response = NextResponse.redirect(url, 307);
    response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Referrer-Policy", "no-referrer"); return response;
  } catch (error) { return apiError(error); }
}
