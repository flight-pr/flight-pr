// Opt-in end-to-end check against the configured Supabase, app and R2 bucket.
// Generates a private, disposable file and removes its objects and metadata.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import sharp from "sharp";
import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

if (!process.argv.includes("--allow-live")) throw new Error("Passa --allow-live per eseguire il trasferimento reale di prova.");
const emailIndex = process.argv.indexOf("--admin-email");
const email = emailIndex >= 0 ? process.argv[emailIndex + 1] : undefined;
if (!email) throw new Error("Specifica --admin-email con un amministratore esistente.");
process.loadEnvFile(".env.local");
process.env.NO_PROXY = [process.env.NO_PROXY, "localhost", "127.0.0.1"].filter(Boolean).join(",");
const base = process.env.APP_URL || "http://localhost:3000";
const publicBase = new URL(base).hostname === "dash.flightpr.it" ? "https://transfer.flightpr.it" : base;
const pagePrefix = publicBase === base ? "/t/" : "/";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const jar = new Map();
const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: {
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)),
} });
const s3 = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED", maxAttempts: 1 });
let transfer;
let adminId;
let revoked = false;
let signedIn = false;
async function api(path, body) {
  const response = await fetch(`${base}/api/intranet/${path}`, { method: body ? "POST" : "GET", headers: { Origin: new URL(base).origin, Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} · ${data.error || "operazione non riuscita"}`);
  return data;
}
try {
  const profile = await admin.from("staff_profiles").select("id,role,active").eq("email", email).single();
  assert.ifError(profile.error);
  assert.equal(profile.data.role, "admin"); assert.equal(profile.data.active, true);
  adminId = profile.data.id;
  // generateLink does not send an email or change the user's password.
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email }); assert.ifError(link.error);
  const login = await auth.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "magiclink" }); assert.ifError(login.error); signedIn = true;
  const overview = await api("overview"); assert.equal(overview.r2Configured, true);
  console.log("Accesso amministratore e configurazione R2 verificati.");
  if (process.env.R2_SITE_ACCESS_KEY_ID && process.env.R2_SITE_SECRET_ACCESS_KEY && process.env.R2_SITE_BUCKET) {
    const imageStore = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_SITE_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SITE_SECRET_ACCESS_KEY } });
    let imageKey;
    try {
      const png = await sharp({ create: { width: 96, height: 64, channels: 3, background: "#f36a21" } }).png().toBuffer();
      const form = new FormData(); form.set("file", new Blob([png], { type: "image/png" }), "verifica-temporanea.png");
      const upload = await fetch(`${base}/api/intranet/media`, { method: "POST", headers: { Origin: new URL(base).origin, Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") }, body: form, signal: AbortSignal.timeout(60000) });
      assert.equal(upload.status, 201, "Upload immagine del sito non riuscito");
      const image = await upload.json(); const imageUrl = new URL(image.url);
      assert.equal(imageUrl.origin, process.env.SITE_ASSETS_URL || "https://drive.flightpr.it");
      assert.match(imageUrl.pathname, /^\/media\/[0-9a-f-]+\.webp$/); imageKey = imageUrl.pathname.slice(1);
      const publicImage = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) }); assert.equal(publicImage.status, 200); assert.match(publicImage.headers.get("content-type") || "", /image\/webp/);
      const metadata = await sharp(Buffer.from(await publicImage.arrayBuffer())).metadata(); assert.equal(metadata.format, "webp"); assert.equal(metadata.width, 96); assert.equal(metadata.height, 64);
      console.log("Upload immagini via API, conversione WebP e lettura dal dominio pubblico verificati.");
    } finally {
      if (imageKey) await imageStore.send(new DeleteObjectCommand({ Bucket: process.env.R2_SITE_BUCKET, Key: imageKey }));
      imageStore.destroy();
    }
  }
  const total = 64 * 1024 * 1024 + 1024;
  transfer = await api("transfers", { title: "Verifica tecnica temporanea R2", recipient: "", message: "File sintetico creato esclusivamente per verificare il trasferimento. Rimosso automaticamente al termine del test.", contact_id: null, days: 1, files: [{ name: "r2-intranet-check.bin", size: total, type: "application/octet-stream" }] });
  const file = transfer.files[0]; const parts = []; const expected = createHash("sha256");
  for (let offset = 0, part = 1; offset < total; offset += transfer.partSize, part++) {
    const payload = Buffer.alloc(Math.min(transfer.partSize, total - offset), part);
    expected.update(payload);
    const signed = await api(`transfers/${transfer.id}`, { action: "sign", fileId: file.id, partNumber: part });
    if (part === 1) {
      const preflight = await fetch(signed.url, { method: "OPTIONS", headers: { Origin: new URL(base).origin, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" }, signal: AbortSignal.timeout(20000) });
      assert.ok(preflight.ok, "Preflight CORS non riuscito"); assert.equal(preflight.headers.get("access-control-allow-origin"), new URL(base).origin);
    }
    const response = await fetch(signed.url, { method: "PUT", headers: { Origin: new URL(base).origin }, body: payload, signal: AbortSignal.timeout(120000) });
    assert.ok(response.ok, `Upload parte ${part}: HTTP ${response.status}`);
    assert.equal(response.headers.get("access-control-allow-origin"), new URL(base).origin);
    assert.match(response.headers.get("access-control-expose-headers") || "", /etag/i);
    const ETag = response.headers.get("etag"); assert.ok(ETag);
    parts.push({ PartNumber: part, ETag }); console.log(`Parte ${part} caricata (${payload.length} byte).`);
  }
  await api(`transfers/${transfer.id}`, { action: "complete-file", fileId: file.id, parts });
  await api(`transfers/${transfer.id}`, { action: "finish" });
  const page = await fetch(`${publicBase}${pagePrefix}${transfer.token}`, { signal: AbortSignal.timeout(20000) }); assert.equal(page.status, 200); assert.match(await page.text(), /r2-intranet-check\.bin/);
  const route = `${publicBase}/api/transfers/${transfer.token}/${file.id}`;
  const redirect = await fetch(route, { redirect: "manual", signal: AbortSignal.timeout(20000) }); assert.equal(redirect.status, 307);
  const download = await fetch(redirect.headers.get("location"), { signal: AbortSignal.timeout(120000) }); assert.ok(download.ok);
  const actual = createHash("sha256"); let bytes = 0;
  for await (const chunk of download.body) { actual.update(chunk); bytes += chunk.length; }
  assert.equal(bytes, total); assert.equal(actual.digest("hex"), expected.digest("hex"));
  console.log("Download pubblico verificato: dimensione e SHA-256 corrispondono.");
  const revoke = await api(`transfers/${transfer.id}`, { action: "revoke" }); assert.equal(revoke.cleanupPending, false); revoked = true;
  const blocked = await fetch(route, { redirect: "manual", signal: AbortSignal.timeout(20000) }); assert.equal(blocked.status, 404);
  try { await s3.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: `transfers/${transfer.id}/${file.id}` }), { abortSignal: AbortSignal.timeout(20000) }); throw new Error("L’oggetto esiste ancora dopo la revoca."); }
  catch (error) { if (error.$metadata?.httpStatusCode !== 404) throw error; }
  const cleanup = await fetch(`${base}/api/cron/transfers`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(30000) }); assert.ok(cleanup.ok);
  console.log("Revoca, cancellazione fisica e autenticazione della pulizia verificate.");
} catch (error) {
  // Do not log request objects, cookies, credentials or presigned URLs.
  console.error(`Verifica R2 non riuscita: ${error.message}`); process.exitCode = 1;
} finally {
  if (transfer && !revoked) {
    try { const result = await api(`transfers/${transfer.id}`, { action: "revoke" }); revoked = !result.cleanupPending; } catch { console.error("Pulizia del trasferimento di prova da ritentare tramite cron."); }
  }
  if (transfer && revoked) {
    const result = await admin.from("transfers").delete().eq("id", transfer.id).eq("created_by", adminId);
    if (result.error) { console.error("Metadata di prova da rimuovere manualmente."); process.exitCode = 1; }
  }
  if (signedIn) await auth.auth.signOut({ scope: "local" });
  s3.destroy();
}
