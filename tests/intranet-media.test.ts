import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { compressPublicImage } from "../lib/intranet/public-image";
import { landingSchema } from "../lib/intranet/validation";
test("public photographs are resized, converted to WebP and stripped of metadata", async () => {
  const source = await sharp({ create: { width: 4000, height: 2400, channels: 3, background: "#997744" } }).jpeg({ quality: 95 }).withMetadata().toBuffer();
  const output = await compressPublicImage(source); const metadata = await sharp(output.bytes).metadata();
  assert.equal(metadata.format, "webp"); assert.equal(output.width, 2560); assert.equal(output.height, 1536); assert.equal(metadata.exif, undefined); assert.ok(output.bytes.length < source.length);
});
test("public image conversion applies orientation and rejects non-photograph input", async () => {
  const source = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "#336655" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const output = await compressPublicImage(source); assert.equal(output.width, 600); assert.equal(output.height, 1200);
  await assert.rejects(() => compressPublicImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>')));
  await assert.rejects(() => compressPublicImage(Buffer.from("not an image")));
});
test("new landing content validates font, FAQs, images and section anchors", () => {
  const page = { title: "Demo", slug: "pagina-demo", template: "attivita", eyebrow: "Demo", heading: "Attività", description: "Presentazione", image_url: "", cta_label: "Contatti", cta_url: "#contatti", accent: "#f36a21", status: "draft", heading_font: "manrope", faq: [{ question: "Come funziona?", answer: "Parliamone." }], intro_image_url: "https://drive.flightpr.it/media/test.webp" };
  assert.ok(landingSchema.safeParse(page).success);
  assert.equal(landingSchema.safeParse({ ...page, heading_font: "arbitrary-css" }).success, false);
  assert.equal(landingSchema.safeParse({ ...page, faq: [{ question: "", answer: "Test" }] }).success, false);
  assert.equal(landingSchema.safeParse({ ...page, intro_image_url: "javascript:alert(1)" }).success, false);
});
