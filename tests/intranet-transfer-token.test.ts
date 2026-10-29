import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { openTransferToken, sealTransferToken } from "../lib/intranet/transfer-token";

test("sharing tokens can be recovered without storing the bearer token in plaintext", () => {
  const token = randomBytes(32).toString("base64url"); const id = crypto.randomUUID();
  const encrypted = sealTransferToken(token, id, "test-service-credential");
  assert.ok(!encrypted.includes(token));
  assert.equal(openTransferToken(encrypted, id, "test-service-credential"), token);
  assert.notEqual(sealTransferToken(token, id, "test-service-credential"), encrypted);
});
test("encrypted sharing tokens reject a different transfer, changed key and modified ciphertext", () => {
  const id = crypto.randomUUID(); const encrypted = sealTransferToken("a".repeat(43), id, "test-service-credential");
  assert.throws(() => openTransferToken(encrypted, crypto.randomUUID(), "test-service-credential"));
  assert.throws(() => openTransferToken(encrypted, id, "another-service-credential"));
  const pieces = encrypted.split("."); pieces[2] = (pieces[2][0] === "A" ? "B" : "A") + pieces[2].slice(1);
  assert.throws(() => openTransferToken(pieces.join("."), id, "test-service-credential"));
  assert.throws(() => openTransferToken("bad-format", id, "test-service-credential"));
  assert.throws(() => sealTransferToken("a".repeat(43), id, ""));
});
