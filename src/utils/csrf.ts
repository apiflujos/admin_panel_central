import crypto from "crypto";

function getSecret() {
  const secret = String(process.env.CSRF_SECRET || process.env.CRYPTO_KEY_BASE64 || "").trim();
  return secret || null;
}

export function createCsrfToken(sessionToken: string) {
  const secret = getSecret();
  if (!secret) return null;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(sessionToken);
  return hmac.digest("hex");
}

export function verifyCsrfToken(sessionToken: string, token: string) {
  const expected = createCsrfToken(sessionToken);
  if (!expected) return false;
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(String(token || ""), "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
