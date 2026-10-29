import sharp from "sharp";
import { adminDb, ApiError, apiError, checkOrigin, dbError, json, requireStaff } from "@/lib/intranet/server";
import { quoteSettingsSchema } from "@/lib/intranet/quote-settings";
import { getQuoteSettings } from "@/lib/intranet/quote-settings-server";
export const runtime = "nodejs";
export async function GET() {
  try { const { db } = await requireStaff(); return json(await getQuoteSettings(db)); }
  catch (error) { return apiError(error); }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const { profile } = await requireStaff(true);
    const settings = quoteSettingsSchema.parse(await request.json());
    if (settings.logo_data_url) {
      const bytes = Buffer.from(settings.logo_data_url.split(",")[1], "base64");
      if (bytes.length > 2 * 1024 * 1024) throw new ApiError(400, "Il logo può pesare al massimo 2 MB.");
      let png: Buffer;
      try {
        const image = sharp(bytes, { limitInputPixels: 16000000, animated: false });
        const metadata = await image.metadata();
        if (!["png", "jpeg"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("Unsupported image");
        png = await image.rotate().resize({ width: 1000, height: 300, fit: "inside", withoutEnlargement: true }).png().toBuffer();
      } catch { throw new ApiError(400, "Il logo non è un’immagine PNG o JPG valida. Scegli un altro file."); }
      if (png.length > 1024 * 1024) throw new ApiError(400, "Il logo è troppo complesso. Usa un’immagine più piccola.");
      settings.logo_data_url = `data:image/png;base64,${png.toString("base64")}`;
    }
    const { error } = await adminDb().from("quote_settings").update({ values: settings, updated_by: profile.id, updated_at: new Date().toISOString() }).eq("id", "default").select("id").single();
    dbError(error); return json(settings);
  } catch (error) { return apiError(error); }
}
