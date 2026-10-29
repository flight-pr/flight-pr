import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { once } from "node:events";
import { startMockService } from "./supabase-mock.mjs";

// Isolated Next.js + disposable Supabase fixture. Never uses real service credentials.
const previous = await Promise.all(["tsconfig.json", "next-env.d.ts"].map((path) => readFile(path)));
const mock = await startMockService();
const probe = createServer(); await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve)); const port = probe.address().port; await new Promise((resolve) => probe.close(resolve));
const base = `http://localhost:${port}`;
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: mock.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "mock-publishable-key", SUPABASE_SERVICE_ROLE_KEY: "mock-service-key", APP_URL: base, NEXT_BUILD_DIR: ".next-intranet-test", R2_ACCOUNT_ID: "mock-account", R2_ACCESS_KEY_ID: "", R2_SECRET_ACCESS_KEY: "", R2_BUCKET: "", R2_SITE_BUCKET: "site-assets", R2_SITE_ACCESS_KEY_ID: "fixture-site-key", R2_SITE_SECRET_ACCESS_KEY: "fixture-site-secret", R2_SITE_ENDPOINT: mock.url, SITE_ASSETS_URL: "https://drive.flightpr.it", CRON_SECRET: "", SITE_MAINTENANCE: "true" };
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
let output = ""; next.stdout.on("data", (v) => { output = (output + v).slice(-12000); }); next.stderr.on("data", (v) => { output = (output + v).slice(-12000); });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch(`${base}/intranet/login`); if (response.ok) { ready = true; break; } } catch { /* Starting. */ }
    if (next.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error(`Test server did not start.\n${output}`);
  const tests = spawn(process.execPath, ["--test", "tests/intranet-http.test.mjs"], { env: { ...env, INTRANET_TEST_URL: base, INTRANET_MOCK_URL: mock.url }, stdio: "inherit" });
  const [code] = await once(tests, "exit"); process.exitCode = code || 0;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (next.exitCode === null) { next.kill("SIGTERM"); await once(next, "exit").catch(() => {}); }
  await new Promise((resolve) => mock.server.close(resolve));
  await Promise.all(["tsconfig.json", "next-env.d.ts"].map((path, i) => writeFile(path, previous[i])));
}
