import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { before, test } from "node:test";
import { createServerClient } from "@supabase/ssr";
import { createHash, randomBytes } from "node:crypto";
import { ADMIN_ID, STAFF_ID, TEST_PASSWORD } from "./support/supabase-mock.mjs";
const base = process.env.INTRANET_TEST_URL;
if (base && !["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Integration tests only run against a disposable loopback server.");
const mockUrl = process.env.INTRANET_MOCK_URL || "http://127.0.0.1:4107";
let admin; let staff; let outsider;
async function cookie(email) {
  const jar = new Map(); const client = createServerClient(mockUrl, "mock-publishable-key", { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)) } });
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD }); assert.ifError(error);
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}
async function request(path, { method = "GET", data, session = admin, origin = base } = {}) {
  return fetch(`${base}${path}`, { method, headers: { ...(session ? { Cookie: session } : {}), ...(method !== "GET" ? { Origin: origin, "Content-Type": "application/json" } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
}
before(async () => { if (base) { admin = await cookie("admin@example.test"); staff = await cookie("staff@example.test"); outsider = await cookie("outside@example.test"); } });
// Fetch ignores a custom Host header; use HTTP to exercise actual virtual hosts.
function hosted(host, path) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(`${base}${path}`, { headers: { Host: host } }, (res) => {
      const chunks = []; res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers })));
    }); req.on("error", reject); req.end();
  });
}
const integration = (name, fn) => test(name, { skip: !base }, fn);
const contact = { name: "Cliente integrazione", email: "cliente@example.test", phone: "", company: "Test", status: "Nuovo", services: ["Fotografia", "Video"], value: 2500, event_date: null, follow_up: "2026-11-01", owner_id: STAFF_ID, notes: "Dati fittizi" };
integration("APIs deny anonymous users and authenticated non-staff", async () => {
  assert.equal((await request("/api/intranet/overview", { session: "" })).status, 401);
  assert.equal((await request("/api/intranet/overview", { session: outsider })).status, 403);
  assert.equal((await request("/api/intranet/overview", { session: staff })).status, 200);
});
integration("mutations reject cross-origin requests and role escalation", async () => {
  assert.equal((await request("/api/intranet/contacts", { method: "POST", origin: "https://evil.example", data: contact })).status, 403);
  assert.equal((await request("/api/intranet/contacts", { method: "POST", data: { ...contact, role: "admin" } })).status, 400);
  assert.equal((await request("/api/intranet/staff", { method: "POST", session: staff, data: { name: "Forbidden", email: "forbidden@example.test", role: "admin" } })).status, 403);
  assert.equal((await request(`/api/intranet/staff?id=${ADMIN_ID}`, { method: "PATCH", data: { role: "staff", active: false } })).status, 400);
});
integration("CRM create, status update, activity and deletion work through protected APIs", async () => {
  const created = await request("/api/intranet/contacts", { method: "POST", data: contact }); assert.equal(created.status, 201); const c = await created.json();
  assert.ok(c.id); assert.equal(c.value, 2500);
  const changed = await request(`/api/intranet/contacts?id=${c.id}`, { method: "PATCH", session: staff, data: { ...contact, status: "Preventivo" } }); assert.equal(changed.status, 200);
  const note = await request("/api/intranet/activities", { method: "POST", session: staff, data: { contact_id: c.id, body: "Preventivo inviato" } }); assert.equal(note.status, 201); assert.equal((await note.json()).author_id, STAFF_ID);
  const activities = await (await request(`/api/intranet/activities?contact=${c.id}`)).json(); assert.ok(activities.some((a) => a.body.includes("→ Preventivo"))); assert.ok(activities.some((a) => a.body === "Preventivo inviato"));
  assert.equal((await request(`/api/intranet/contacts?id=${c.id}`, { method: "DELETE" })).status, 200);
});
integration("draft landings stay private and published content updates immediately", async () => {
  const landing = { title: "Pagina integrazione", slug: "pagina-integrazione", template: "editoriale", eyebrow: "Test locale", heading: "Contenuto verificato", description: "Dati fittizi", image_url: "", cta_label: "Contattaci", cta_url: "/contatti", accent: "#f36a21", status: "draft" };
  const result = await request("/api/intranet/landings", { method: "POST", data: landing }); assert.equal(result.status, 201); const l = await result.json();
  assert.equal((await request(`/lp/${l.slug}`, { session: "" })).status, 404);
  assert.equal((await request(`/api/intranet/landings?id=${l.id}`, { method: "PATCH", data: { ...landing, status: "published" } })).status, 200);
  const page = await request(`/lp/${l.slug}`, { session: "" }); assert.equal(page.status, 200); assert.match(await page.text(), /Contenuto verificato/);
  assert.equal((await request(`/api/intranet/landings?id=${l.id}`, { method: "PATCH", data: landing })).status, 200);
  assert.equal((await request(`/lp/${l.slug}`, { session: "" })).status, 404);
  assert.equal((await request(`/api/intranet/landings?id=${l.id}`, { method: "DELETE" })).status, 200);
});
integration("suspension takes effect with an already issued session", async () => {
  assert.equal((await request(`/api/intranet/staff?id=${STAFF_ID}`, { method: "PATCH", data: { role: "staff", active: false } })).status, 200);
  assert.equal((await request("/api/intranet/overview", { session: staff })).status, 403);
  assert.equal((await request(`/api/intranet/staff?id=${STAFF_ID}`, { method: "PATCH", data: { role: "staff", active: true } })).status, 200);
  assert.equal((await request("/api/intranet/overview", { session: staff })).status, 200);
});
integration("transfers fail closed without R2 and cleanup requires its secret", async () => {
  const transfer = { title: "Test", recipient: "", message: "", contact_id: null, days: 7, files: [{ name: "test.mov", size: 100, type: "video/quicktime" }] };
  assert.equal((await request("/api/intranet/transfers", { method: "POST", data: transfer })).status, 503);
  assert.equal((await request("/api/cron/transfers", { session: "" })).status, 401);
  assert.equal((await request(`/api/transfers/${"a".repeat(43)}/${crypto.randomUUID()}`, { session: "" })).status, 404);
  const overview = await (await request("/api/intranet/overview")).json(); assert.equal(overview.r2Configured, false); assert.equal(overview.transfers.length, 0);
});
integration("revocation blocks sharing even during a storage outage; expired tokens never issue URLs", async () => {
  for (const expired of [false, true]) {
    const id = crypto.randomUUID(); const token = randomBytes(32).toString("base64url");
    const row = { id, title: "Trasferimento fittizio", recipient: "", message: "", status: "ready", created_by: ADMIN_ID, token_hash: createHash("sha256").update(token).digest("hex"), expires_at: new Date(Date.now() + (expired ? -1 : 1) * 86400000).toISOString(), transfer_files: [] };
    const seeded = await fetch(`${mockUrl}/rest/v1/transfers`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer mock-service-key" }, body: JSON.stringify(row) }); assert.equal(seeded.status, 201);
    if (!expired) {
      const revoked = await request(`/api/intranet/transfers/${id}`, { method: "POST", data: { action: "revoke" } }); assert.equal(revoked.status, 200); assert.equal((await revoked.json()).cleanupPending, true);
      assert.equal((await request(`/api/intranet/transfers/${id}`, { method: "POST", data: { action: "share" } })).status, 410);
    }
    assert.equal((await request(`/api/transfers/${token}/${crypto.randomUUID()}`, { session: "" })).status, 404);
    await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "DELETE", headers: { Authorization: "Bearer mock-service-key" } });
  }
});

integration("pipeline-only changes preserve client data and record status history", async () => {
  const c = await (await request("/api/intranet/contacts", { method: "POST", data: contact })).json();
  const response = await request(`/api/intranet/contacts?id=${c.id}&pipeline=1`, { method: "PATCH", data: { status: "Confermato", follow_up: "2026-12-02" } });
  assert.equal(response.status, 200); const updated = await response.json(); assert.equal(updated.name, contact.name); assert.equal(updated.notes, contact.notes); assert.equal(updated.status, "Confermato");
  const history = await (await request(`/api/intranet/activities?contact=${c.id}`)).json(); assert.ok(history.some((a) => a.body.includes("→ Confermato")));
  assert.equal((await request(`/api/intranet/contacts?id=${c.id}&pipeline=1`, { method: "PATCH", data: { status: "Nuovo", follow_up: null, name: "Injected" } })).status, 400);
  await request(`/api/intranet/contacts?id=${c.id}`, { method: "DELETE" });
});
integration("PDF generation requires staff, checks origin and returns a real downloadable PDF", async () => {
  const data = { number: "FP-TEST", title: "Produzione contenuti", issued_on: "2026-10-26", valid_until: "2026-11-26", recipient: "Cliente test", recipient_details: "Roma", issuer_details: "Flight P.R.", items: [{ description: "Foto e video", quantity: 2, unit_price: 100.25 }], discount: 10, vat: 22, notes: "Consegna concordata" };
  for (const [session, status] of [["", 401], [outsider, 403]]) assert.equal((await request("/api/intranet/quotes", { method: "POST", session, data })).status, status);
  assert.equal((await request("/api/intranet/quotes", { method: "POST", data, origin: "https://evil.test" })).status, 403);
  assert.equal((await request("/api/intranet/quotes", { method: "POST", data: { ...data, items: [] } })).status, 400);
  const pdf = await request("/api/intranet/quotes", { method: "POST", session: staff, data });
  assert.equal(pdf.status, 200); assert.match(pdf.headers.get("content-type"), /application\/pdf/); assert.match(pdf.headers.get("content-disposition"), /attachment; filename="preventivo-FP-TEST.pdf"/); assert.match(pdf.headers.get("cache-control"), /no-store/); assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
});
integration("location and business pages publish their complete content and galleries", async () => {
  for (const template of ["location", "attivita"]) {
    const data = { title: "La terrazza", slug: `terrazza-${template}`, template, eyebrow: "Roma", heading: "La terrazza", description: "Una vista speciale", image_url: "https://example.test/hero.jpg", location_address: "Via Roma 1", location_details: "Informazioni approfondite sulla terrazza", gallery: [{ url: "https://example.test/garden.jpg", caption: "Il giardino" }], offerings: [{ title: "Ricevimenti", description: "Momenti speciali" }], contact_email: "info@example.test", contact_phone: "+39000", opening_hours: "Lunedì 9–18", cta_label: "Scrivici", cta_url: "mailto:info@example.test", accent: "#f36a21", status: "published" };
    const response = await request("/api/intranet/landings", { method: "POST", data }); assert.equal(response.status, 201); const l = await response.json();
    const page = await request(`/lp/${l.slug}`, { session: "" }); assert.equal(page.status, 200); const html = await page.text();
    for (const content of ["Informazioni approfondite sulla terrazza", "Il giardino", "Via Roma 1", "Ricevimenti", "info@example.test"]) assert.ok(html.includes(content), content);
    const hostedPage = await hosted("app.flightpr.it", `/${l.slug}`);
    assert.equal(hostedPage.status, 200); const hostedHtml = await hostedPage.text();
    assert.ok(hostedHtml.includes("Informazioni approfondite sulla terrazza"));
    assert.ok(hostedHtml.includes(`https://app.flightpr.it/${l.slug}`));
    assert.equal((hostedHtml.match(/class="navbar /g) || []).length, template === "location" ? 1 : 0);
    await request(`/api/intranet/landings?id=${l.id}`, { method: "DELETE" });
  }
});

integration("public maintenance returns a temporary response while localhost and staff remain available", async () => {
  for (const path of ["/", "/portfolio", "/matrimoni", "/contatti"]) {
    const page = await hosted("flightpr.it", path); assert.equal(page.status, 503);
    assert.equal(page.headers.get("retry-after"), "3600"); assert.match(page.headers.get("cache-control"), /no-store/);
    assert.match(await page.text(), /Manutenzione/);
  }
  const local = await fetch(`${base}/`); assert.equal(local.status, 200); assert.ok(!(await local.text()).includes("<em>in corso.</em>"));
  assert.equal((await hosted("flightpr.it", "/favicon.webp")).status, 200);
});

integration("production hosts redirect aliases and isolate staff and transfer surfaces", async () => {
  const alias = await hosted("flightpr.net", "/portfolio?from=alias");
  assert.equal(alias.status, 308); assert.equal(alias.headers.get("location"), "https://flightpr.it/portfolio?from=alias");
  const staffRedirect = await hosted("flightpr.it", "/intranet/transfers");
  assert.equal(staffRedirect.headers.get("location"), "https://dash.flightpr.it/transfers");
  const staffLogin = await hosted("dash.flightpr.it", "/login");
  assert.equal(staffLogin.status, 200); assert.ok((await staffLogin.text()).includes("Accedi"));
  for (const host of ["app.flightpr.it", "transfer.flightpr.it", "flightpr.it"]) {
    assert.equal((await hosted(host, "/api/intranet/overview")).status, 404);
  }
  for (const host of ["dash.flightpr.it", "transfer.flightpr.it"]) {
    const robots = await hosted(host, "/robots.txt"); assert.equal(robots.status, 200); assert.match(await robots.text(), /Disallow: \//);
  }
});

integration("copying a transfer link preserves its token; only explicit generation rotates it", async () => {
  const id = crypto.randomUUID(); const oldToken = randomBytes(32).toString("base64url");
  const seed = { id, title: "Transfer link actions", status: "ready", created_by: ADMIN_ID, token_hash: createHash("sha256").update(oldToken).digest("hex"), expires_at: new Date(Date.now() + 86400000).toISOString(), transfer_files: [] };
  const headers = { Authorization: "Bearer mock-service-key", "Content-Type": "application/json" };
  await fetch(`${mockUrl}/rest/v1/transfers`, { method: "POST", headers, body: JSON.stringify(seed) });
  const path = `/api/intranet/transfers/${id}`;
  try {
    assert.equal((await request(path, { session: "" })).status, 401);
    assert.equal((await request(path, { session: outsider })).status, 403);
    const legacy = await request(path); assert.equal(legacy.status, 409); assert.match((await legacy.json()).error, /Genera nuovo link/);
    let rows = await (await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { headers })).json(); assert.equal(rows[0].token_hash, seed.token_hash);
    const generated = await request(path, { method: "POST", data: { action: "share" }, session: staff }); assert.equal(generated.status, 200); const { token } = await generated.json(); assert.notEqual(token, oldToken);
    rows = await (await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { headers })).json(); assert.ok(rows[0].token_ciphertext); assert.ok(!rows[0].token_ciphertext.includes(token));
    for (let i = 0; i < 3; i++) { const copied = await request(path, { session: staff }); assert.equal(copied.status, 200); assert.match(copied.headers.get("cache-control"), /no-store/); assert.equal((await copied.json()).token, token); }
    const rotated = await (await request(path, { method: "POST", data: { action: "share" } })).json(); assert.notEqual(rotated.token, token); assert.equal((await (await request(path)).json()).token, rotated.token);
    rows = await (await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { headers })).json(); assert.equal(rows[0].token_hash, createHash("sha256").update(rotated.token).digest("hex"));
    const download = await request(`/t/${rotated.token}`, { session: "" }); const html = await download.text(); assert.ok(html.includes("Transfer link actions")); assert.ok(!html.includes("Copia link")); assert.ok(!html.includes("staff-transfer-copy-button"));
    const overview = await (await request("/api/intranet/overview")).json(); const summary = overview.transfers.find((t) => t.id === id); assert.equal(summary.token_ciphertext, undefined); assert.equal(summary.token_hash, undefined);
    await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "revoked" }) }); assert.equal((await request(path)).status, 410);
    await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "ready", expires_at: new Date(Date.now() - 1000).toISOString() }) }); assert.equal((await request(path)).status, 410);
    await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "uploading", expires_at: seed.expires_at }) }); assert.equal((await request(path)).status, 409);
  } finally { await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "DELETE", headers }); }
});

integration("transfer deletion requires staff, same origin and prior revocation", async () => {
  const headers = { Authorization: "Bearer mock-service-key", "Content-Type": "application/json" };
  const id = crypto.randomUUID(); const row = { id, title: "Delete fixture", status: "ready", created_by: ADMIN_ID, token_hash: createHash("sha256").update(randomBytes(32)).digest("hex"), expires_at: new Date(Date.now() + 86400000).toISOString(), transfer_files: [] };
  await fetch(`${mockUrl}/rest/v1/transfers`, { method: "POST", headers, body: JSON.stringify(row) });
  const path = `/api/intranet/transfers/${id}`;
  try {
    assert.equal((await request(path, { method: "DELETE", session: "" })).status, 401);
    assert.equal((await request(path, { method: "DELETE", session: outsider })).status, 403);
    assert.equal((await request(path, { method: "DELETE", origin: "https://evil.test" })).status, 403);
    assert.equal((await request(path, { method: "DELETE" })).status, 409);
    await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify({ status: "revoked", revoked_at: new Date().toISOString() }) });
    const deleted = await request(path, { method: "DELETE", session: staff }); assert.equal(deleted.status, 200); assert.equal((await deleted.json()).cleanupPending, true);
    assert.equal((await request(path)).status, 410);
    const list = await (await request("/api/intranet/overview")).json(); assert.ok(!list.transfers.some((t) => t.id === id));
    await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify({ purged_at: new Date().toISOString() }) });
    const settled = await request(path, { method: "DELETE", session: staff }); assert.equal(settled.status, 200); assert.equal((await settled.json()).cleanupPending, false);
    assert.equal((await request(path)).status, 404);
  } finally { await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "DELETE", headers }); }
});
integration("deleted transfers disappear during an R2 outage while storage keys remain for cleanup", async () => {
  const headers = { Authorization: "Bearer mock-service-key", "Content-Type": "application/json" };
  const id = crypto.randomUUID(); const fileId = crypto.randomUUID();
  const row = { id, title: "Deferred deletion fixture", status: "revoked", revoked_at: new Date().toISOString(), created_by: ADMIN_ID, token_hash: createHash("sha256").update(randomBytes(32)).digest("hex"), expires_at: new Date(Date.now() + 86400000).toISOString(), transfer_files: [{ id: fileId, name: "test.jpg", size: 100, key: `transfers/${id}/${fileId}`, completed: true }] };
  await fetch(`${mockUrl}/rest/v1/transfers`, { method: "POST", headers, body: JSON.stringify(row) });
  try {
    const removed = await request(`/api/intranet/transfers/${id}`, { method: "DELETE" }); assert.equal(removed.status, 200); assert.equal((await removed.json()).cleanupPending, true);
    const stored = await (await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { headers })).json(); assert.ok(stored[0].deleted_at); assert.equal(stored[0].transfer_files[0].key, row.transfer_files[0].key); assert.equal(stored[0].purged_at, null);
    const overview = await (await request("/api/intranet/overview")).json(); assert.ok(!overview.transfers.some((t) => t.id === id));
    assert.equal((await request(`/api/intranet/transfers/${id}`, { method: "DELETE" })).status, 200);
    await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "PATCH", headers, body: JSON.stringify({ purged_at: new Date().toISOString() }) });
    const finished = await request(`/api/intranet/transfers/${id}`, { method: "DELETE" }); assert.equal(finished.status, 200); assert.equal((await finished.json()).cleanupPending, false);
    assert.equal((await request(`/api/intranet/transfers/${id}`)).status, 404);
  } finally { await fetch(`${mockUrl}/rest/v1/transfers?id=eq.${id}`, { method: "DELETE", headers }); }
});

integration("company quote settings are shared, admin-only to update and validate logos", async () => {
  const path = "/api/intranet/quote-settings";
  assert.equal((await request(path, { session: "" })).status, 401);
  assert.equal((await request(path, { session: outsider })).status, 403);
  const original = await (await request(path)).json();
  const updated = { ...original, company_name: "Studio configurato", address: "Via Test 8, Roma", number_prefix: "ST", validity_days: 45, default_vat: 10, default_discount: 5, payment_terms: "Saldo alla consegna", default_notes: "Note di prova" };
  try {
    assert.equal((await request(path, { method: "PUT", session: staff, data: updated })).status, 403);
    assert.equal((await request(path, { method: "PUT", origin: "https://evil.test", data: updated })).status, 403);
    assert.equal((await request(path, { method: "PUT", data: { ...updated, default_vat: 101 } })).status, 400);
    assert.equal((await request(path, { method: "PUT", data: { ...updated, logo_data_url: "data:image/png;base64,aW52YWxpZA==" } })).status, 400);
    const { readFile } = await import("node:fs/promises"); const png = await readFile(new URL("../public/favicon.png", import.meta.url));
    const saved = await request(path, { method: "PUT", data: { ...updated, logo_data_url: `data:image/png;base64,${png.toString("base64")}` } }); assert.equal(saved.status, 200); const settings = await saved.json();
    assert.match(settings.logo_data_url, /^data:image\/png;base64,/);
    const staffCopy = await (await request(path, { session: staff })).json(); assert.equal(staffCopy.company_name, updated.company_name); assert.equal(staffCopy.default_vat, 10); assert.equal(staffCopy.logo_data_url, settings.logo_data_url);
    const q = { number: "ST-TEST", issued_on: "2026-10-26", valid_until: "2026-12-10", title: "Proposta", recipient: "Cliente test", recipient_details: "Roma", issuer_details: "Studio configurato", items: [{ description: "Foto", quantity: 1, unit_price: 100 }], discount: 5, vat: 10, notes: "Saldo alla consegna" };
    const pdf = await request("/api/intranet/quotes", { method: "POST", data: q, session: staff }); assert.equal(pdf.status, 200);
    const { PDFDocument } = await import("pdf-lib"); const document = await PDFDocument.load(await pdf.arrayBuffer()); assert.equal(document.getAuthor(), updated.company_name); assert.ok(document.getPages()[0].node.Resources().toString().includes("/XObject"));
    const page = await request("/intranet/quote-settings"); assert.equal(page.status, 200); assert.match(await page.text(), /Impostazioni preventivi/);
  } finally { assert.equal((await request(path, { method: "PUT", data: original })).status, 200); }
});

integration("public-image upload requires staff and stores only compressed WebP in the site bucket", async () => {
  const sharp = (await import("sharp")).default;
  const bytes = await sharp({ create: { width: 3200, height: 1800, channels: 3, background: "#aa8855" } }).jpeg({ quality: 95 }).withMetadata().toBuffer();
  async function upload(session, origin = base, data = bytes) { const form = new FormData(); form.set("file", new Blob([data], { type: "image/jpeg" }), "original-private-name.jpg"); return fetch(`${base}/api/intranet/media`, { method: "POST", headers: { ...(session ? { Cookie: session } : {}), Origin: origin }, body: form }); }
  assert.equal((await upload("")).status, 401); assert.equal((await upload(outsider)).status, 403); assert.equal((await upload(admin, "https://evil.test")).status, 403);
  assert.equal((await upload(admin, base, Buffer.from("not an image"))).status, 400);
  const result = await upload(staff); assert.equal(result.status, 201); const image = await result.json(); assert.match(image.url, /^https:\/\/drive\.flightpr\.it\/media\/[a-f0-9-]+\.webp$/); assert.equal(image.width, 2560); assert.equal(image.height, 1440);
  const stored = await fetch(`${mockUrl}/site-assets${new URL(image.url).pathname}`); assert.equal(stored.status, 200); assert.equal(stored.headers.get("content-type"), "image/webp"); assert.match(stored.headers.get("cache-control"), /immutable/); const compressed = Buffer.from(await stored.arrayBuffer()); assert.equal((await sharp(compressed).metadata()).format, "webp"); assert.equal((await sharp(compressed).metadata()).exif, undefined);
});
