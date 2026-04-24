import crypto from "crypto";

export function verifyShopifyHmac(rawBody: Buffer, signature: string) {
  const secret = String(process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET || "").trim();
  if (!secret) {
    if (String(process.env.ALLOW_UNVERIFIED_SHOPIFY_WEBHOOKS || "").toLowerCase() === "true") {
      return true;
    }
    return false;
  }
  if (!rawBody) {
    return false;
  }
  const normalizedSignature = String(signature || "").trim();
  if (!normalizedSignature) {
    return false;
  }
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");

  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(normalizedSignature, "utf8");
  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

export function verifyAlegraSignature(rawBody: Buffer, signature: string) {
  const secret = process.env.ALEGRA_WEBHOOK_SECRET || "";
  if (!secret) {
    console.warn("[webhook] ALEGRA_WEBHOOK_SECRET not set — rejecting unsigned Alegra webhook");
    return false;
  }
  if (!rawBody) {
    return false;
  }
  const normalizedSignature = String(signature || "").trim();
  if (!normalizedSignature) {
    return false;
  }
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(normalizedSignature, "utf8");
  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}
