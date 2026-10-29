// Disposable, loopback-only service for integration tests and visual QA.
// It does not implement or validate PostgreSQL RLS; those policies must also be
// checked against the configured Supabase project before production use.
import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
export const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
export const STAFF_ID = "22222222-2222-4222-8222-222222222222";
export const NONSTAFF_ID = "33333333-3333-4333-8333-333333333333";
export const TEST_PASSWORD = "fixture-password-only-2026";
export async function startMockService(port = 0) {
  const tables = { staff_profiles: [
    { id: ADMIN_ID, name: "Andrea Demo", email: "admin@example.test", role: "admin", active: true, created_at: new Date().toISOString() },
    { id: STAFF_ID, name: "Giulia Demo", email: "staff@example.test", role: "staff", active: true, created_at: new Date().toISOString() },
  ], contacts: [], contact_activities: [], landing_pages: [], transfers: [], transfer_files: [], quote_settings: [{ id: "default", values: {} }] };
  function user(id) { return { id, aud: "authenticated", role: "authenticated", email: tables.staff_profiles.find((s) => s.id === id)?.email || "outside@example.test", email_confirmed_at: new Date().toISOString(), app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [], created_at: new Date().toISOString() }; }
  function session(id) {
    const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const input = `${enc({ alg: "HS256", typ: "JWT" })}.${enc({ sub: id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
    return { access_token: `${input}.${createHmac("sha256", "test-only").update(input).digest("base64url")}`, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "fixture-refresh-token", user: user(id) };
  }
  const mediaObjects = new Map();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("Content-Type", "application/json");
    const origin = req.headers.origin; if (origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version"); res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,HEAD,OPTIONS");
    const send = (value, status = 200) => { res.statusCode = status; res.end(JSON.stringify(value)); };
    if (req.method === "OPTIONS") { res.end(); return; }
    if (url.pathname.startsWith("/site-assets/")) {
      if (req.method === "PUT") { const chunks = []; for await (const chunk of req) chunks.push(chunk); mediaObjects.set(url.pathname, { body: Buffer.concat(chunks), type: req.headers["content-type"], cache: req.headers["cache-control"] }); res.setHeader("ETag", '"fixture-etag"'); res.statusCode = 200; res.end(); return; }
      const object = mediaObjects.get(url.pathname);
      if (!object) { res.statusCode = 404; res.end(); return; }
      res.setHeader("Content-Type", object.type || "image/webp"); res.setHeader("Cache-Control", object.cache || "public"); res.end(object.body); return;
    }
    let raw = ""; for await (const chunk of req) raw += chunk; const body = raw ? JSON.parse(raw) : {};
    const authorization = req.headers.authorization || ""; let id;
    try { id = JSON.parse(Buffer.from(authorization.replace("Bearer ", "").split(".")[1], "base64url").toString()).sub; } catch { /* Anonymous or service key. */ }
    if (url.pathname === "/auth/v1/token") { if (body.password !== TEST_PASSWORD && url.searchParams.get("grant_type") !== "refresh_token") return send({ msg: "Invalid credentials" }, 400); const member = tables.staff_profiles.find((s) => s.email === body.email); return send(session(member?.id || NONSTAFF_ID)); }
    if (url.pathname === "/auth/v1/user") return id ? send(user(id)) : send({ msg: "Invalid token" }, 401);
    if (url.pathname === "/auth/v1/logout") return send({});
    if (url.pathname === "/auth/v1/invite") { const newUser = user(randomUUID()); newUser.email = body.email; return send(newUser); }
    const table = url.pathname.split("/")[3]; if (!tables[table]) return send({ message: "Not found" }, 404);
    let rows = tables[table].filter((row) => [...url.searchParams].every(([key, filter]) => {
      if (["select", "order", "limit", "offset", "or"].includes(key)) return true;
      if (filter.startsWith("eq.")) return String(row[key]) === filter.slice(3);
      if (filter.startsWith("gt.")) return row[key] > filter.slice(3);
      if (filter === "is.null") return row[key] == null;
      return true;
    }));
    const accept = req.headers.accept || "";
    if (req.method === "POST") {
      const items = Array.isArray(body) ? body : [body]; rows = items.map((item) => ({ id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(table === "staff_profiles" ? { active: true } : {}), ...item }));
      for (const row of rows) { if (table === "landing_pages" && tables[table].some((r) => r.slug === row.slug)) return send({ code: "23505", message: "Duplicate slug" }, 409); }
      tables[table].push(...rows);
      if (table === "contacts") for (const c of rows) tables.contact_activities.push({ id: randomUUID(), contact_id: c.id, author_id: id, body: `Contatto creato · ${c.status}`, created_at: new Date().toISOString() });
      res.statusCode = 201;
    }
    if (req.method === "PATCH") for (const row of rows) { if (table === "contacts" && body.status !== row.status) tables.contact_activities.push({ id: randomUUID(), contact_id: row.id, author_id: id, body: `Stato: ${row.status} → ${body.status}`, created_at: new Date().toISOString() }); Object.assign(row, body, { updated_at: new Date().toISOString() }); }
    if (req.method === "DELETE") { tables[table] = tables[table].filter((r) => !rows.includes(r)); if (table === "contacts") tables.contact_activities = tables.contact_activities.filter((a) => !rows.some((r) => r.id === a.contact_id)); }
    res.setHeader("Content-Range", `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
    if (req.method === "HEAD") { res.end(); return; }
    const order = url.searchParams.get("order"); if (order) { const [field, dir] = order.split("."); rows = [...rows].sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (dir === "desc" ? -1 : 1)); }
    const offset = Number(url.searchParams.get("offset") || 0); rows = rows.slice(offset, offset + Number(url.searchParams.get("limit") || 1000));
    if (accept.includes("vnd.pgrst.object")) return rows.length === 1 ? send(rows[0], res.statusCode) : send({ code: "PGRST116", message: "Not found" }, 406);
    return send(rows, res.statusCode);
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { server, tables, session, url: `http://127.0.0.1:${server.address().port}` };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const fixture = await startMockService(Number(process.env.MOCK_PORT || 4107)); console.log(`Disposable Supabase fixture: ${fixture.url}`); }
