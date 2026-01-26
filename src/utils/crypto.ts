import crypto from "crypto";

type EncryptedPayload = {
  iv: string;
  tag: string;
  data: string;
};

function getKey() {
  const keyBase64 = process.env.CRYPTO_KEY_BASE64 || "";
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error("CRYPTO_KEY_BASE64 must be 32 bytes in base64");
  }
  return key;
}

export function encryptString(plainText: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
  return JSON.stringify(payload);
}

export function decryptString(payload: string) {
  const parsed = JSON.parse(payload) as EncryptedPayload;
  const iv = Buffer.from(parsed.iv, "base64");
  const tag = Buffer.from(parsed.tag, "base64");
  const data = Buffer.from(parsed.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
