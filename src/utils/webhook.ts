import crypto from "crypto";

export function verifyShopifyHmac(rawBody: Buffer, signature: string) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "";
  if (!secret) {
    return true;
  }
  if (!rawBody) {
    return false;
  }
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);
  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

export function verifyAlegraSignature(rawBody: Buffer, signature: string) {
  const secret = process.env.ALEGRA_WEBHOOK_SECRET || "";
  if (!secret) {
    return true;
  }
  if (!rawBody) {
    return false;
  }
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}
