import { apiError, checkOrigin, requireStaff } from "@/lib/intranet/server";
import { quoteSchema } from "@/lib/intranet/quote";
import { getQuoteSettings } from "@/lib/intranet/quote-settings-server";
import { createQuotePdf } from "@/lib/intranet/quote-pdf";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request); const { db } = await requireStaff();
    const quote = quoteSchema.parse(await request.json());
    const settings = await getQuoteSettings(db);
    const bytes = await createQuotePdf(quote, settings);
    const filename = `preventivo-${quote.number.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (e) { return apiError(e); }
}
