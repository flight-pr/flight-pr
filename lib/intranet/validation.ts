import { z } from "zod";
import { MAX_FILE_SIZE, serviceNames, statuses, templates, landingFonts } from "./types";

const text = (max: number) => z.string().trim().max(max);
const optionalDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => { const date = new Date(`${v}T00:00:00Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v; }, "Data non valida"), z.null()]);
const uuid = z.string().uuid();
export const contactSchema = z.object({ name: text(160).min(1), email: z.union([z.email(), z.literal("")]), phone: text(50), company: text(160), status: z.enum(statuses), services: z.array(z.enum(serviceNames)).max(4), value: z.number().min(0).max(100000000), event_date: optionalDate, follow_up: optionalDate, owner_id: uuid.nullable(), notes: text(10000) }).strict();
export const pipelineSchema = z.object({ status: z.enum(statuses), follow_up: optionalDate }).strict();
export const activitySchema = z.object({ contact_id: uuid, body: text(4000).min(1) }).strict();
const safeLink = z.string().max(2000).refine((v) => {
  if (/[\\\x00-\x1f\x7f]/.test(v)) return false;
  if (/^#[A-Za-z][\w-]*$/.test(v) || /^\/(?!\/)/.test(v) || /^mailto:[^\s]+@[^\s]+$/.test(v) || /^tel:\+?[\d\s-]+$/.test(v)) return true;
  try { const url = new URL(v); return url.protocol === "https:" && Boolean(url.hostname); } catch { return false; }
}, "Usa un link interno, HTTPS, mailto o tel");
const imageUrl = z.url().refine((v) => v.startsWith("https://"), "Usa un’immagine HTTPS");
export const landingSchema = z.object({ title: text(160).min(1), slug: z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa lettere minuscole, numeri e trattini"), template: z.enum(templates), eyebrow: text(160), heading: text(250).min(1), description: text(5000), image_url: z.union([z.url().refine((v) => v.startsWith("https://"), "Usa un’immagine HTTPS"), z.literal("")]), heading_font: z.enum(landingFonts).default("cormorant"), hero_subtitle: text(500).default(""), intro_title: text(200).default(""), intro_image_url: z.union([imageUrl, z.literal("")]).default(""), services_title: text(200).default(""), gallery_title: text(200).default(""), feature_title: text(200).default(""), feature_text: text(5000).default(""), feature_image_url: z.union([imageUrl, z.literal("")]).default(""), contact_title: text(200).default(""), contact_description: text(2000).default(""), footer_info: text(1500).default(""), faq: z.array(z.object({ question: text(300).min(1), answer: text(3000).min(1) }).strict()).max(8).default([]), contact_email: z.union([z.email(), z.literal("")]).default(""), contact_phone: text(50).default(""), opening_hours: text(1000).default(""), offerings: z.array(z.object({ title: text(120).min(1), description: text(1000) }).strict()).max(12).default([]), location_address: text(500).default(""), location_details: text(10000).default(""), gallery: z.array(z.object({ url: imageUrl, caption: text(300) }).strict()).max(20).default([]), cta_label: text(80).min(1), cta_url: safeLink, accent: z.string().regex(/^#[a-fA-F0-9]{6}$/), status: z.enum(["draft", "published"]) }).strict();
export const staffInviteSchema = z.object({ name: text(160).min(1), email: z.email(), role: z.enum(["admin", "staff"]) }).strict();
export const staffUpdateSchema = z.object({ role: z.enum(["admin", "staff"]), active: z.boolean() }).strict();
export const transferSchema = z.object({ title: text(160).min(1), recipient: z.union([z.email(), z.literal("")]), message: text(4000), contact_id: uuid.nullable(), days: z.number().int().min(1).max(30), files: z.array(z.object({ name: text(255).min(1).refine((v) => !/[\x00-\x1f\x7f]/.test(v), "Nome file non valido"), size: z.number().int().positive().max(MAX_FILE_SIZE), type: text(160) })).min(1).max(50) }).strict().refine((v) => v.files.reduce((sum, f) => sum + f.size, 0) <= 500 * 1024 ** 3, "Massimo 500 GB per trasferimento");
export const uploadActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sign"), fileId: uuid, partNumber: z.number().int().min(1).max(10000) }).strict(),
  z.object({ action: z.literal("complete-file"), fileId: uuid, parts: z.array(z.object({ ETag: z.string().min(1).max(160), PartNumber: z.number().int().min(1).max(10000) }).strict()).min(1).max(10000) }).strict(),
  z.object({ action: z.literal("finish") }).strict(),
  z.object({ action: z.literal("revoke") }).strict(),
  z.object({ action: z.literal("share") }).strict(),
]);
