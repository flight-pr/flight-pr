import { z } from "zod";
const text = (max: number) => z.string().trim().max(max);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => { const d = new Date(`${v}T00:00:00Z`); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v; }, "Data non valida");
export const quoteSchema = z.object({
  number: text(80).min(1), issued_on: day, valid_until: day,
  title: text(200).min(1), recipient: text(300).min(1), recipient_details: text(2000),
  issuer_details: text(2000), notes: text(6000),
  items: z.array(z.object({ description: text(1000).min(1), quantity: z.number().positive().max(100000).multipleOf(0.01), unit_price: z.number().min(0).max(10000000).multipleOf(0.01) }).strict()).min(1).max(50),
  discount: z.number().min(0).max(100), vat: z.number().min(0).max(100),
}).strict().refine((v) => v.valid_until >= v.issued_on, { message: "La scadenza deve seguire la data del preventivo", path: ["valid_until"] });
export type Quote = z.infer<typeof quoteSchema>;
export function quoteTotals(quote: Pick<Quote, "items" | "discount" | "vat">) {
  const rows = quote.items.map((item) => Math.round(Math.round(item.unit_price * 100) * item.quantity));
  const subtotal = rows.reduce((sum, cents) => sum + cents, 0);
  const discount = Math.round(subtotal * quote.discount / 100);
  const taxable = subtotal - discount;
  const vat = Math.round(taxable * quote.vat / 100);
  return { rows, subtotal, discount, taxable, vat, total: taxable + vat };
}
export const quoteMoney = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
