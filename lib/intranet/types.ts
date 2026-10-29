export const statuses = ["Nuovo", "Contattato", "Preventivo", "Confermato", "Completato", "Perso"] as const;
export const serviceNames = ["Fotografia", "Video", "Drone", "Eventi"] as const;
export const availableTemplates = ["location", "attivita"] as const;
// Keep legacy template values readable for existing published pages.
export const templates = [...availableTemplates, "editoriale", "matrimonio", "evento"] as const;
export type Staff = { id: string; name: string; email: string; role: "admin" | "staff"; active: boolean; created_at: string };
export type Contact = { id: string; name: string; email: string; phone: string; company: string; status: typeof statuses[number]; services: string[]; value: number; event_date: string | null; follow_up: string | null; owner_id: string | null; notes: string; created_at: string; updated_at: string };
export type Activity = { id: string; contact_id: string; author_id: string; body: string; created_at: string };
export const landingFonts = ["manrope", "cormorant", "montserrat", "georgia"] as const;
export type LandingPhoto = { url: string; caption: string };
export type Landing = { id: string; title: string; slug: string; template: typeof templates[number]; eyebrow: string; heading: string; description: string; image_url: string; location_address?: string; location_details?: string; gallery?: LandingPhoto[]; heading_font?: typeof landingFonts[number]; hero_subtitle?: string; intro_title?: string; intro_image_url?: string; services_title?: string; gallery_title?: string; feature_title?: string; feature_text?: string; feature_image_url?: string; contact_title?: string; contact_description?: string; footer_info?: string; faq?: { question: string; answer: string }[]; contact_email?: string; contact_phone?: string; opening_hours?: string; offerings?: { title: string; description: string }[]; cta_label: string; cta_url: string; accent: string; status: "draft" | "published"; updated_at: string; created_at: string };
export type TransferFile = { id: string; name: string; size: number; type: string; key?: string; upload_id?: string | null; completed: boolean };
export type Transfer = { id: string; title: string; recipient: string; message: string; contact_id: string | null; expires_at: string; status: "uploading" | "ready" | "revoked" | "expired"; revoked_at?: string | null; deleted_at?: string | null; purged_at?: string | null; created_at: string; created_by: string; transfer_files: TransferFile[] };
export function formatBytes(bytes: number) { if (!bytes) return "0 B"; const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 4); return `${(bytes / 1024 ** i).toLocaleString("it-IT", { maximumFractionDigits: 1 })} ${["B", "KB", "MB", "GB", "TB"][i]}`; }
export const PART_SIZE = 64 * 1024 * 1024;
export const MAX_FILE_SIZE = 100 * 1024 ** 3;
