import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const buildRoot = new URL("../.next/server/app/", import.meta.url);

test("renders the Flight P.R. home page", async () => {
  const html = await readFile(new URL("index.html", buildRoot), "utf8");

  assert.match(html, /<html lang="it">/i);
  assert.match(html, /<title>Flight P\.R\. \| Fotografia e Video per Matrimoni ed Eventi<\/title>/i);
  assert.match(html, /Ci sono momenti/);
  assert.match(html, /Le immagini restano\./);
  assert.match(html, /rel="canonical" href="https:\/\/flightpr\.it"/i);
});

test("prerenders the main pages and portfolio entries", async () => {
  const pages = [
    "portfolio.html",
    "portfolio/18-silvia.html",
    "portfolio/18-viola.html",
    "portfolio/60-fabio.html",
    "contatti.html",
    "privacy.html",
  ];

  for (const page of pages) {
    const html = await readFile(new URL(page, buildRoot), "utf8");
    assert.match(html, /<main\b/i, `${page} should contain the main content`);
  }
});

test("generates public discovery metadata", async () => {
  const [sitemap, robots, manifest] = await Promise.all([
    readFile(new URL("sitemap.xml.body", buildRoot), "utf8"),
    readFile(new URL("robots.txt.body", buildRoot), "utf8"),
    readFile(new URL("manifest.webmanifest.body", buildRoot), "utf8"),
  ]);

  assert.match(sitemap, /https:\/\/flightpr\.it\/portfolio/);
  assert.match(robots, /Sitemap: https:\/\/flightpr\.it\/sitemap\.xml/);
  assert.equal(JSON.parse(manifest).name, "Flight P.R. — Flight Personal Recording");
});
