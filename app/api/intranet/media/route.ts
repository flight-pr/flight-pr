import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { ApiError, apiError, checkOrigin, json, requireStaff } from "@/lib/intranet/server";
import { compressPublicImage } from "@/lib/intranet/public-image";
import { siteMediaOrigin, siteStorage } from "@/lib/intranet/site-storage";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    checkOrigin(request); await requireStaff();
    const store = siteStorage();
    if (Number(request.headers.get("content-length") || 0) > 4 * 1024 * 1024) throw new ApiError(413, "L’immagine supera il limite di caricamento. Riprova con un file più piccolo.");
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024) throw new ApiError(400, "Seleziona un’immagine valida di massimo 4 MB dopo l’ottimizzazione.");
    let output: Awaited<ReturnType<typeof compressPublicImage>>;
    try { output = await compressPublicImage(Buffer.from(await file.arrayBuffer())); }
    catch { throw new ApiError(400, "Immagine non valida. Carica un file JPG, PNG, WebP o AVIF non animato."); }
    const key = `media/${randomUUID()}.webp`;
    await store.send(new PutObjectCommand({ Bucket: process.env.R2_SITE_BUCKET!, Key: key, Body: output.bytes, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" }));
    return json({ url: `${siteMediaOrigin()}/${key}`, width: output.width, height: output.height, bytes: output.bytes.length }, 201);
  } catch (error) { return apiError(error); }
}
