import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { encryptString, decryptString } from "./crypto";

describe("crypto utilities", () => {
  const testKey = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY="; // 32 bytes: "abcdefghijklmnopqrstuvwxyz123456"

  beforeEach(() => {
    vi.stubEnv("CRYPTO_KEY_BASE64", testKey);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should encrypt and decrypt a string correctly", () => {
    const originalText = "Hello, World!";
    const encrypted = encryptString(originalText);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe("string");

    const decrypted = decryptString(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it("should throw an error if the key is missing or invalid", () => {
    vi.stubEnv("CRYPTO_KEY_BASE64", "");
    expect(() => encryptString("test")).toThrow("CRYPTO_KEY_BASE64 must be 32 bytes in base64");
  });

  it("should throw an error for invalid payload in decryptString", () => {
    expect(() => decryptString("invalid-json")).toThrow("Payload cifrado invalido.");
  });

  it("should handle authentication errors during decryption", () => {
    const originalText = "Sensitive Data";
    const encrypted = encryptString(originalText);

    // Change the key so authentication fails. Key must be 32 bytes.
    // "ModifiedKeyForFailureTesting1234" is 32 chars.
    vi.stubEnv("CRYPTO_KEY_BASE64", "TW9kaWZpZWRLZXlGb3JGYWlsdXJlVGVzdGluZzEyMzQ=");

    expect(() => decryptString(encrypted)).toThrow(/No se pudo leer credenciales guardadas/);
  });
});
