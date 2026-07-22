import { describe, expect, it } from "vitest";

import { isPlausibleHostname, UnsafeHostError, assertPublicHostname } from "./safe-host";

describe("isPlausibleHostname", () => {
  it("accepts a bare public hostname", () => {
    expect(isPlausibleHostname("mitienda.com")).toBe(true);
    expect(isPlausibleHostname("shop.example.co")).toBe(true);
  });

  it("rejects hostnames with schema, path, port or auth", () => {
    expect(isPlausibleHostname("http://mitienda.com")).toBe(false);
    expect(isPlausibleHostname("mitienda.com/wp-admin")).toBe(false);
    expect(isPlausibleHostname("mitienda.com:8080")).toBe(false);
    expect(isPlausibleHostname("evil.com@127.0.0.1")).toBe(false);
    expect(isPlausibleHostname("evil.com#127.0.0.1")).toBe(false);
    expect(isPlausibleHostname("mitienda.com?foo=bar")).toBe(false);
  });

  it("rejects empty or single-label hostnames", () => {
    expect(isPlausibleHostname("")).toBe(false);
    expect(isPlausibleHostname("localhost")).toBe(false);
  });
});

describe("assertPublicHostname", () => {
  it("throws for localhost even without DNS", async () => {
    await expect(assertPublicHostname("localhost")).rejects.toBeInstanceOf(UnsafeHostError);
    await expect(assertPublicHostname("api.localhost")).rejects.toBeInstanceOf(UnsafeHostError);
  });

  it("throws for empty input", async () => {
    await expect(assertPublicHostname("")).rejects.toBeInstanceOf(UnsafeHostError);
  });

  it("throws for URL-shaped input", async () => {
    await expect(assertPublicHostname("http://mitienda.com/wp-admin")).rejects.toBeInstanceOf(UnsafeHostError);
  });

  it("bypasses DNS check when ALLOW_INTERNAL_HOSTS=true", async () => {
    const prev = process.env.ALLOW_INTERNAL_HOSTS;
    process.env.ALLOW_INTERNAL_HOSTS = "true";
    try {
      await expect(assertPublicHostname("intranet.local")).resolves.toBeUndefined();
    } finally {
      if (prev === undefined) delete process.env.ALLOW_INTERNAL_HOSTS;
      else process.env.ALLOW_INTERNAL_HOSTS = prev;
    }
  });
});
