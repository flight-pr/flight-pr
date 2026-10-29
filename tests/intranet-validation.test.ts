import assert from "node:assert/strict";
import test from "node:test";
import { activitySchema, contactSchema, landingSchema, staffInviteSchema, staffUpdateSchema, transferSchema, uploadActionSchema } from "../lib/intranet/validation";
import { MAX_FILE_SIZE, PART_SIZE, formatBytes } from "../lib/intranet/types";
const contact = { name: "Cliente di test", email: "cliente@example.test", phone: "+390000000000", company: "", status: "Nuovo", services: ["Fotografia"], value: 1000, event_date: null, follow_up: "2026-11-01", owner_id: null, notes: "" };
const landing = { title: "Pagina test", slug: "pagina-test", template: "editoriale", eyebrow: "Flight", heading: "Titolo", description: "Descrizione", image_url: "", cta_label: "Contattaci", cta_url: "/contatti", accent: "#f36a21", status: "draft" };
const transfer = { title: "Film test", recipient: "", message: "", contact_id: null, days: 7, files: [{ name: "film.mov", size: PART_SIZE + 1, type: "video/quicktime" }] };
test("CRM accepts services and follow-ups and rejects role/identity injection", () => {
  assert.equal(contactSchema.parse(contact).services[0], "Fotografia");
  for (const change of [{ role: "admin" }, { id: crypto.randomUUID() }, { value: -1 }, { status: "Inventato" }, { services: ["Altro"] }, { follow_up: "domani" }, { event_date: "2026-02-30" }, { owner_id: "user" }]) assert.equal(contactSchema.safeParse({ ...contact, ...change }).success, false);
});
test("activities require an existing contact UUID and reject forged author", () => {
  const note = { contact_id: crypto.randomUUID(), body: "Chiamata effettuata" };
  assert.ok(activitySchema.safeParse(note).success);
  assert.equal(activitySchema.safeParse({ ...note, author_id: crypto.randomUUID() }).success, false);
  assert.equal(activitySchema.safeParse({ ...note, body: " " }).success, false);
});
test("landing links accept supported destinations", () => {
  for (const cta_url of ["/contatti", "https://example.test", "mailto:studio@example.test", "tel:+39000000000"]) assert.ok(landingSchema.safeParse({ ...landing, cta_url }).success, cta_url);
});
test("landing links reject script URLs, protocol-relative destinations and malformed slugs", () => {
  for (const cta_url of ["javascript:alert(1)", "data:text/html,test", "//example.test", "http://example.test", "/\\example.test", "/\n/example.test", "https://"]) assert.equal(landingSchema.safeParse({ ...landing, cta_url }).success, false, cta_url);
  for (const slug of ["../admin", "hello world", "UPPER", "abc/def", "--a"]) assert.equal(landingSchema.safeParse({ ...landing, slug }).success, false, slug);
  assert.equal(landingSchema.safeParse({ ...landing, image_url: "javascript:alert(1)" }).success, false);
  assert.equal(landingSchema.safeParse({ ...landing, html: "<script>" }).success, false);
});
test("staff inputs reject active/identity injection and unknown roles", () => {
  assert.ok(staffInviteSchema.safeParse({ name: "Test", email: "staff@example.test", role: "staff" }).success);
  assert.equal(staffInviteSchema.safeParse({ name: "Test", email: "staff@example.test", role: "owner" }).success, false);
  assert.equal(staffUpdateSchema.safeParse({ role: "admin", active: true, id: "forged" }).success, false);
});
test("multipart accepts files larger than one block and enforces size, count and expiration", () => {
  assert.ok(transferSchema.safeParse(transfer).success);
  assert.ok(transferSchema.safeParse({ ...transfer, files: [{ ...transfer.files[0], size: MAX_FILE_SIZE }] }).success);
  for (const days of [0, 31, -1, 1.5]) assert.equal(transferSchema.safeParse({ ...transfer, days }).success, false);
  for (const size of [0, -1, MAX_FILE_SIZE + 1]) assert.equal(transferSchema.safeParse({ ...transfer, files: [{ ...transfer.files[0], size }] }).success, false);
  assert.equal(transferSchema.safeParse({ ...transfer, files: [] }).success, false);
  assert.equal(transferSchema.safeParse({ ...transfer, files: Array(51).fill(transfer.files[0]) }).success, false);
  assert.equal(transferSchema.safeParse({ ...transfer, files: Array(6).fill({ ...transfer.files[0], size: MAX_FILE_SIZE }) }).success, false);
  assert.equal(transferSchema.safeParse({ ...transfer, files: [{ ...transfer.files[0], name: "bad\r\nname" }] }).success, false);
});
test("signed upload actions cannot specify arbitrary R2 paths or upload IDs", () => {
  const action = { action: "sign", fileId: crypto.randomUUID(), partNumber: 1 };
  assert.ok(uploadActionSchema.safeParse(action).success);
  for (const addition of [{ key: "another-client/file" }, { uploadId: "forged" }, { partNumber: 0 }, { partNumber: 10001 }]) assert.equal(uploadActionSchema.safeParse({ ...action, ...addition }).success, false);
  assert.equal(uploadActionSchema.safeParse({ action: "complete-file", fileId: crypto.randomUUID(), parts: [] }).success, false);
});
test("file sizes remain finite and readable at the configured boundaries", () => {
  assert.equal(formatBytes(0), "0 B"); assert.equal(formatBytes(1024), "1 KB"); assert.equal(formatBytes(MAX_FILE_SIZE), "100 GB");
  assert.ok(Math.ceil(MAX_FILE_SIZE / PART_SIZE) < 10000);
});

test("location and business pages validate galleries and public contact details", () => {
  for (const template of ["location", "attivita"]) assert.ok(landingSchema.safeParse({ ...landing, template, location_details: "La storia del luogo", gallery: [{ url: "https://example.test/photo.jpg", caption: "Il giardino" }], offerings: [{ title: "Servizio", description: "Dettagli" }], contact_email: "info@example.test", contact_phone: "+39 123", opening_hours: "Lun–Ven 9–18" }).success);
  for (const gallery of [[{ url: "javascript:alert(1)", caption: "" }], Array(21).fill({ url: "https://example.test/a.jpg", caption: "" })]) assert.equal(landingSchema.safeParse({ ...landing, gallery }).success, false);
  assert.equal(landingSchema.safeParse({ ...landing, contact_email: "non-email" }).success, false);
});
