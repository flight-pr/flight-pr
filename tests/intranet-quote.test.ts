import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { quoteSchema, quoteTotals, type Quote } from "../lib/intranet/quote";
import { createQuotePdf } from "../lib/intranet/quote-pdf";
const quote: Quote = { number: "FP-TEST", title: "Fotografia e film", issued_on: "2026-10-26", valid_until: "2026-11-26", recipient: "Caffè delle Arti", recipient_details: "Roma", issuer_details: "Flight P.R.\nP.IVA 18244501005", items: [{ description: "Foto", quantity: 3, unit_price: 0.1 }, { description: "Film", quantity: 1.5, unit_price: 100.25 }], discount: 10, vat: 22, notes: "Consegna concordata" };
test("quote totals round each row and taxes to cents", () => { assert.deepEqual(quoteTotals(quote), { rows: [30, 15038], subtotal: 15068, discount: 1507, taxable: 13561, vat: 2983, total: 16544 }); });
test("quotes reject invalid dates, negative amounts, empty lines and identity injection", () => {
  assert.ok(quoteSchema.safeParse(quote).success);
  for (const change of [{ issued_on: "2026-02-30" }, { valid_until: "2025-01-01" }, { discount: 101 }, { vat: -1 }, { items: [] }, { items: [{ description: "", quantity: 1, unit_price: 10 }] }, { items: [{ description: "Bad", quantity: 0, unit_price: 10 }] }, { items: [{ description: "Bad", quantity: 1, unit_price: -10 }] }, { author_id: "forged" }]) assert.equal(quoteSchema.safeParse({ ...quote, ...change }).success, false);
});
test("PDF supports long multi-page proposals and unfamiliar glyphs without crashing", async () => {
  const bytes = await createQuotePdf({ ...quote, recipient: "Caffè – 東京 📷", items: Array.from({ length: 50 }, (_, i) => ({ description: `Servizio ${i + 1} ${"Una descrizione dettagliata. ".repeat(15)}`, quantity: 1, unit_price: 120 })), notes: "Condizioni\n".repeat(60) });
  const pdf = await PDFDocument.load(bytes); assert.ok(pdf.getPageCount() > 3); assert.equal(pdf.getTitle(), "FP-TEST - Fotografia e film");
});

test("quote defaults validate company fields and generate complete issuer details", async () => {
  const { defaultQuoteSettings, quoteSettingsSchema, quoteIssuerDetails, quoteDefaultNotes } = await import("../lib/intranet/quote-settings");
  const settings = { ...defaultQuoteSettings, company_name: "Studio di prova", address: "Via Test 1, Roma", tax_code: "CFTEST", phone: "+39 0600", payment_terms: "30% alla conferma", default_notes: "Due revisioni incluse" };
  assert.ok(quoteSettingsSchema.safeParse(settings).success);
  assert.match(quoteIssuerDetails(settings), /Studio di prova\nVia Test 1, Roma/); assert.match(quoteIssuerDetails(settings), /C.F. CFTEST/);
  assert.equal(quoteDefaultNotes(settings), "30% alla conferma\n\nDue revisioni incluse");
  for (const change of [{ company_name: "" }, { validity_days: 0 }, { validity_days: 1.5 }, { default_vat: 101 }, { default_quantity: 0 }, { number_prefix: "bad/prefix" }, { logo_data_url: "https://example.test/logo.svg" }, { website: "javascript:alert(1)" }, { email: "bad-email" }, { role: "admin" }]) assert.equal(quoteSettingsSchema.safeParse({ ...settings, ...change }).success, false);
});
test("PDF embeds the configured company logo and company author", async () => {
  const { defaultQuoteSettings } = await import("../lib/intranet/quote-settings");
  const { readFile } = await import("node:fs/promises");
  const png = await readFile(new URL("../public/favicon.png", import.meta.url));
  const settings = { ...defaultQuoteSettings, company_name: "Studio di prova", logo_data_url: `data:image/png;base64,${png.toString("base64")}` };
  const bytes = await createQuotePdf(quote, settings); const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getAuthor(), "Studio di prova");
  const resources = doc.getPages()[0].node.Resources(); assert.ok(resources?.toString().includes("/XObject"));
});
