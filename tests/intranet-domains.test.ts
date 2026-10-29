import assert from "node:assert/strict";
import test from "node:test";
import { domainRoute } from "../lib/domain-routing";
import { internalStaffPath, publicLandingUrl, publicTransferUrl, staffActivationUrl } from "../lib/site-origins";
import { showSiteMaintenance } from "../lib/site-maintenance";
test("temporary maintenance covers public pages while preserving local development and tools", () => {
  for (const path of ["/", "/portfolio", "/matrimoni", "/contatti"]) {
    assert.equal(showSiteMaintenance("flightpr.it", path, true), true);
    assert.equal(showSiteMaintenance("flightpr.it", path, false), false);
    for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "dash.flightpr.it", "app.flightpr.it", "transfer.flightpr.it", "drive.flightpr.it"]) assert.equal(showSiteMaintenance(host, path, true), false);
  }
  for (const path of ["/intranet", "/intranet/login", "/lp/villa", "/t/token", "/api/cron/transfers", "/api/transfers/token/file", "/favicon.webp", "/media/home/drone2.webp", "/_next/static/chunk.js", "/robots.txt", "/sitemap.xml"]) assert.equal(showSiteMaintenance("flightpr.it", path, true), false);
  assert.equal(showSiteMaintenance("flight-preview.vercel.app", "/", true), true);
});
test("production surfaces route to the existing protected pages", () => {
  assert.deepEqual(domainRoute("dash.flightpr.it", "/crm"), { kind: "rewrite", path: "/intranet/crm" });
  assert.deepEqual(domainRoute("dash.flightpr.it", "/"), { kind: "rewrite", path: "/intranet" });
  assert.deepEqual(domainRoute("app.flightpr.it", "/villa-aurora"), { kind: "rewrite", path: "/lp/villa-aurora" });
  assert.deepEqual(domainRoute("transfer.flightpr.it", `/${"a".repeat(43)}`), { kind: "rewrite", path: `/t/${"a".repeat(43)}` });
  assert.deepEqual(domainRoute("flightpr.net", "/portfolio"), { kind: "redirect", origin: "https://flightpr.it", path: "/portfolio" });
  assert.equal(domainRoute("flightpr.it", "/intranet/crm").kind, "redirect");
  assert.equal(domainRoute("app.flightpr.it", "/api/intranet/overview").kind, "deny");
  assert.equal(domainRoute("transfer.flightpr.it", "/intranet").kind, "deny");
  assert.equal(domainRoute("flightpr.it", "/api/intranet/overview").kind, "deny");
  assert.equal(domainRoute("localhost", "/intranet/crm").kind, "next");
});
test("sharing URLs use public subdomains and preserve local previews", () => {
  assert.equal(publicLandingUrl("villa-aurora"), "https://app.flightpr.it/villa-aurora");
  assert.equal(publicTransferUrl("token", "https://dash.flightpr.it"), "https://transfer.flightpr.it/token");
  assert.equal(publicLandingUrl("villa", "http://localhost:3000"), "http://localhost:3000/lp/villa");
  assert.equal(publicTransferUrl("token", "https://flight-preview.vercel.app"), "https://flight-preview.vercel.app/t/token");
  assert.equal(staffActivationUrl("https://dash.flightpr.it"), "https://dash.flightpr.it/activate");
  assert.equal(internalStaffPath("/quote-settings"), "/intranet/quote-settings");
});
