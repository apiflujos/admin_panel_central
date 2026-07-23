import crypto from "crypto";

const isProd = () => String(process.env.NODE_ENV || "").toLowerCase() === "production";

function allowUnverified(envKey: string): boolean {
  if (isProd()) {
    if (String(process.env[envKey] || "").toLowerCase() === "true") {
      console.warn(
        `[webhook] ${envKey}=true set in production — ignored. Webhooks without valid signature will be rejected.`
      );
    }
    return false;
  }
  return String(process.env[envKey] || "").toLowerCase() === "true";
}

/**
 * Compare a Shopify webhook HMAC (base64) against a specific app secret. Used
 * both for the env/global fast path and for the per-store fallback. Returns
 * false on any missing input — it never falls back to allowing unverified
 * traffic (that policy lives only in `verifyShopifyHmac`).
 */
export function verifyShopifyHmacWithSecret(rawBody: Buffer, signature: string, secret: string) {
  const normalizedSecret = String(secret || "").trim();
  if (!normalizedSecret || !rawBody) {
    return false;
  }
  const normalizedSignature = String(signature || "").trim();
  if (!normalizedSignature) {
    return false;
  }
  const digest = crypto.createHmac("sha256", normalizedSecret).update(rawBody).digest("base64");

  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(normalizedSignature, "utf8");
  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

export function verifyShopifyHmac(rawBody: Buffer, signature: string) {
  const secret = String(process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET || "").trim();
  if (!secret) {
    if (allowUnverified("ALLOW_UNVERIFIED_SHOPIFY_WEBHOOKS")) {
      return true;
    }
    return false;
  }
  return verifyShopifyHmacWithSecret(rawBody, signature, secret);
}

export function verifyAlegraSignature(rawBody: Buffer, signature: string) {
  const secret = String(process.env.ALEGRA_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    if (allowUnverified("ALLOW_UNVERIFIED_ALEGRA_WEBHOOKS")) {
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
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const signatureBuffer = Buffer.from(normalizedSignature, "utf8");
  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}
