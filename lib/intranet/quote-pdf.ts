import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { quoteMoney, quoteTotals, type Quote } from "./quote";
import { defaultQuoteSettings, type QuoteSettings } from "./quote-settings";

export async function createQuotePdf(quote: Quote, settings: QuoteSettings = defaultQuoteSettings) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${quote.number} - ${quote.title}`); doc.setAuthor(settings.company_name);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.08, .08, .075), muted = rgb(.39, .38, .35), orange = rgb(.95, .39, .1);
  let page = doc.addPage([595.28, 841.89]); let y = 0;
  const safe = (value: string) => Array.from(value).filter((char) => char === "\n" || char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127).map((char) => { if (char === "\n") return char; try { regular.encodeText(char); return char; } catch { return "?"; } }).join("");
  let logo: PDFImage | undefined;
  if (settings.logo_data_url) {
    const bytes = Buffer.from(settings.logo_data_url.split(",")[1], "base64");
    logo = settings.logo_data_url.startsWith("data:image/png;") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  }
  function fitText(value: string, size: number, width: number, font = regular) {
    let result = safe(value).replace(/\s+/g, " ");
    if (font.widthOfTextAtSize(result, size) <= width) return result;
    while (result && font.widthOfTextAtSize(`${result}...`, size) > width) result = result.slice(0, -1);
    return `${result}...`;
  }
  function header() {
    page.drawRectangle({ x: 0, y: 743, width: 596, height: 100, color: ink });
    const textX = logo ? 138 : 44;
    const width = 551 - textX;
    if (logo) {
      page.drawRectangle({ x: 44, y: 765, width: 78, height: 54, color: rgb(1, 1, 1) });
      const scaled = logo.scaleToFit(68, 44);
      page.drawImage(logo, { x: 44 + (78 - scaled.width) / 2, y: 765 + (54 - scaled.height) / 2, width: scaled.width, height: scaled.height });
    }
    const name = safe(settings.company_name).replace(/\s+/g, " ");
    const nameSize = Math.max(12, Math.min(25, width / Math.max(1, bold.widthOfTextAtSize(name, 25)) * 25));
    page.drawText(fitText(name, nameSize, width, bold), { x: textX, y: 794, size: nameSize, font: bold, color: rgb(1,1,1) });
    page.drawText("PREVENTIVO / PROPOSTA ECONOMICA", { x: textX, y: 772, size: 8, font: regular, color: rgb(.85,.83,.79) });
    page.drawRectangle({ x: 44, y: 742, width: 55, height: 3, color: orange }); y = 710;
  }
  function room(height: number) { if (y - height < 68) { page = doc.addPage([595.28, 841.89]); header(); } }
  function line(value: string, size = 11, strong = false, color = ink, x = 44) {
    room(size + 9); page.drawText(safe(value), { x, y, size, font: strong ? bold : regular, color }); y -= size + 9;
  }
  function lines(value: string, size = 11, strong = false, width = 505) {
    const font = strong ? bold : regular;
    for (const paragraph of safe(value).split("\n")) {
      let remaining = paragraph;
      while (font.widthOfTextAtSize(remaining, size) > width) {
        let cut = 1;
        while (cut < remaining.length && font.widthOfTextAtSize(remaining.slice(0, cut + 1), size) <= width) cut++;
        const space = remaining.lastIndexOf(" ", cut);
        if (space > 0) cut = space;
        line(remaining.slice(0, cut), size, strong);
        remaining = remaining.slice(cut).trimStart();
      }
      line(remaining, size, strong);
    }
  }
  const humanDate = (v: string) => v.split("-").reverse().join("/");
  header();
  line(`PREVENTIVO ${quote.number}`, 11, true, orange);
  lines(quote.title, 23, true); y -= 8;
  line(`Emesso il ${humanDate(quote.issued_on)}  /  Valido fino al ${humanDate(quote.valid_until)}`, 10, false, muted); y -= 10;
  line("PREPARATO PER", 9, true, orange); lines(quote.recipient, 14, true);
  if (quote.recipient_details) lines(quote.recipient_details, 10);
  y -= 10; lines(`DA ${settings.company_name.toUpperCase()}`, 9, true);
  lines(quote.issuer_details, 10); y -= 14;
  line("SERVIZI E INVESTIMENTO", 10, true, orange);
  const totals = quoteTotals(quote);
  quote.items.forEach((item, index) => {
    room(65);
    page.drawLine({ start: { x: 44, y: y + 4 }, end: { x: 551, y: y + 4 }, thickness: .5, color: rgb(.84,.83,.8) });
    y -= 14; lines(`${String(index + 1).padStart(2, "0")}  ${item.description}`, 11, true);
    line(`${item.quantity.toLocaleString("it-IT")} x ${quoteMoney(Math.round(item.unit_price * 100))}    =    ${quoteMoney(totals.rows[index])}`, 10, false, muted); y -= 9;
  });
  room(155); y -= 8;
  line(`Subtotale: ${quoteMoney(totals.subtotal)}`, 11, false, muted);
  if (totals.discount) line(`Sconto ${quote.discount}%: -${quoteMoney(totals.discount)}`, 11, false, muted);
  line(`Imponibile: ${quoteMoney(totals.taxable)}`, 11);
  line(`IVA ${quote.vat}%: ${quoteMoney(totals.vat)}`, 11);
  y -= 8; line(`TOTALE  ${quoteMoney(totals.total)}`, 21, true, orange); y -= 16;
  if (quote.notes) { room(65); line("NOTE E CONDIZIONI", 9, true, orange); lines(quote.notes, 10); }
  for (const [index, p] of doc.getPages().entries()) {
    p.drawLine({ start: { x: 44, y: 48 }, end: { x: 551, y: 48 }, thickness: .5, color: rgb(.84,.83,.8) });
    p.drawText(fitText([settings.company_name, settings.email, settings.website].filter(Boolean).join(" / "), 8, 450), { x: 44, y: 32, size: 8, font: regular, color: muted });
    p.drawText(`${index + 1} / ${doc.getPageCount()}`, { x: 517, y: 32, size: 8, font: regular, color: muted });
  }
  return doc.save();
}
