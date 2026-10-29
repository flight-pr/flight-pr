import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

function key(secret: string) {
  if (!secret) throw new Error("Transfer link encryption secret is missing");
  return Buffer.from(hkdfSync("sha256", secret, "flight-pr", "transfer-link-tokens/v1", 32));
}

// Bind each encrypted token to its transfer. The service credential never leaves the server.
export function sealTransferToken(token: string, transferId: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  cipher.setAAD(Buffer.from(transferId));
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
}

export function openTransferToken(value: string, transferId: string, secret: string) {
  const [version, iv, ciphertext, tag, extra] = value.split(".");
  if (version !== "v1" || !iv || !ciphertext || !tag || extra !== undefined) throw new Error("Invalid encrypted transfer token");
  const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(transferId));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
