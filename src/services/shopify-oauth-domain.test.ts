import { describe, expect, it } from "vitest";

import { isValidShopDomain, normalizeShopDomainForOAuth } from "./shopify-oauth.service";

describe("isValidShopDomain", () => {
  it("accepts canonical *.myshopify.com hosts", () => {
    expect(isValidShopDomain("mitienda.myshopify.com")).toBe(true);
    expect(isValidShopDomain("MiTienda.MyShopify.COM")).toBe(true);
    expect(isValidShopDomain(" mitienda.myshopify.com ")).toBe(true);
    expect(isValidShopDomain("https://mitienda.myshopify.com/admin")).toBe(true);
  });

  it("rejects domains that aren't *.myshopify.com", () => {
    expect(isValidShopDomain("mitienda.com")).toBe(false);
    expect(isValidShopDomain("myshopify.com")).toBe(false);
    expect(isValidShopDomain("evil.com/myshopify.com")).toBe(false);
    expect(isValidShopDomain("")).toBe(false);
  });

  it("rejects sub-subdomains and leading hyphens", () => {
    expect(isValidShopDomain(".myshopify.com")).toBe(false);
    expect(isValidShopDomain("-tienda.myshopify.com")).toBe(false);
    expect(isValidShopDomain("shop.a.myshopify.com")).toBe(false);
  });
});

describe("normalizeShopDomainForOAuth", () => {
  it("strips scheme, path and casing", () => {
    expect(normalizeShopDomainForOAuth("https://Foo.myshopify.com/admin/orders")).toBe("foo.myshopify.com");
    expect(normalizeShopDomainForOAuth("http://bar.MYSHOPIFY.com")).toBe("bar.myshopify.com");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeShopDomainForOAuth("")).toBe("");
  });
});
