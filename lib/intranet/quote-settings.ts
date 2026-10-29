import { z } from "zod";
const text = (max: number) => z.string().trim().max(max);
export const quoteSettingsSchema = z.object({
  company_name: text(160).min(1), vat_number: text(40), tax_code: text(40), address: text(500),
  email: z.union([z.email().max(254), z.literal("")]), phone: text(50),
  website: z.union([z.url().max(300).refine((v) => v.startsWith("https://"), "Usa un indirizzo HTTPS"), z.literal("")]),
  logo_data_url: z.string().max(2800000).refine((v) => !v || /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(v), "Carica un logo PNG o JPG"),
  number_prefix: z.string().min(1).max(20).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Usa lettere, numeri, trattini o underscore"),
  validity_days: z.number().int().min(1).max(3650), default_title: text(200).min(1),
  default_item_description: text(1000).min(1), default_quantity: z.number().positive().max(100000).multipleOf(0.01),
  default_unit_price: z.number().min(0).max(10000000).multipleOf(0.01),
  default_discount: z.number().min(0).max(100).multipleOf(0.01), default_vat: z.number().min(0).max(100).multipleOf(0.01),
  payment_terms: text(1500), default_notes: text(4000),
}).strict();
export type QuoteSettings = z.infer<typeof quoteSettingsSchema>;
export const defaultQuoteSettings: QuoteSettings = {
  company_name: "Flight P.R.", vat_number: "18244501005", tax_code: "", address: "",
  email: "info@flightpr.it", phone: "", website: "https://flightpr.it", logo_data_url: "",
  number_prefix: "FP", validity_days: 30, default_title: "Proposta per il tuo progetto",
  default_item_description: "Produzione contenuti", default_quantity: 1, default_unit_price: 0,
  default_discount: 0, default_vat: 22, payment_terms: "", default_notes: "",
};
export function quoteIssuerDetails(settings: QuoteSettings) {
  return [settings.company_name, settings.address,
    [settings.vat_number && `P.IVA ${settings.vat_number}`, settings.tax_code && `C.F. ${settings.tax_code}`].filter(Boolean).join(" · "),
    [settings.email, settings.phone].filter(Boolean).join(" · "), settings.website,
  ].filter(Boolean).join("\n");
}
export function quoteDefaultNotes(settings: QuoteSettings) {
  return [settings.payment_terms, settings.default_notes].filter(Boolean).join("\n\n");
}
