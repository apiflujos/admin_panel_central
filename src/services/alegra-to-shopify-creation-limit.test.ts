import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { allowProductCreation, resetProductCreationLimiterForTests } from "./alegra-to-shopify.service";

/**
 * El freno existe porque `createInShopify` está activado por omisión: cualquier
 * situación que deje muchos ítems sin mapeo dispara altas en cadena, y muchas
 * serían duplicados de productos que ya están en la tienda con otro SKU.
 */
describe("allowProductCreation", () => {
  const original = process.env.SHOPIFY_MAX_PRODUCT_CREATIONS_PER_HOUR;

  beforeEach(() => resetProductCreationLimiterForTests());
  afterEach(() => {
    if (original === undefined) delete process.env.SHOPIFY_MAX_PRODUCT_CREATIONS_PER_HOUR;
    else process.env.SHOPIFY_MAX_PRODUCT_CREATIONS_PER_HOUR = original;
    resetProductCreationLimiterForTests();
  });

  it("permite crear hasta el límite y corta a partir de ahí", () => {
    process.env.SHOPIFY_MAX_PRODUCT_CREATIONS_PER_HOUR = "3";
    expect(allowProductCreation("a.myshopify.com")).toBe(true);
    expect(allowProductCreation("a.myshopify.com")).toBe(true);
    expect(allowProductCreation("a.myshopify.com")).toBe(true);
    // La cuarta es la que habría empezado la ráfaga.
    expect(allowProductCreation("a.myshopify.com")).toBe(false);
    expect(allowProductCreation("a.myshopify.com")).toBe(false);
  });

  it("lleva el cupo por tienda, no global", () => {
    process.env.SHOPIFY_MAX_PRODUCT_CREATIONS_PER_HOUR = "1";
    expect(allowProductCreation("a.myshopify.com")).toBe(true);
    expect(allowProductCreation("a.myshopify.com")).toBe(false);
    // Agotar una tienda no debe bloquear a la otra.
    expect(allowProductCreation("b.myshopify.com")).toBe(true);
  });

  it("con 0 no se crea nada: es el interruptor de emergencia", () => {
    process.env.SHOPIFY_MAX_PRODUCT_CREATIONS_PER_HOUR = "0";
    expect(allowProductCreation("a.myshopify.com")).toBe(false);
  });

  it("un valor basura cae al defecto en vez de quedar SIN límite", () => {
    process.env.SHOPIFY_MAX_PRODUCT_CREATIONS_PER_HOUR = "no-es-un-numero";
    // 50 por defecto: las primeras 50 pasan, la 51 no.
    for (let i = 0; i < 50; i += 1) {
      expect(allowProductCreation("a.myshopify.com")).toBe(true);
    }
    expect(allowProductCreation("a.myshopify.com")).toBe(false);
  });

  it("un valor negativo tampoco desactiva el límite", () => {
    process.env.SHOPIFY_MAX_PRODUCT_CREATIONS_PER_HOUR = "-1";
    for (let i = 0; i < 50; i += 1) allowProductCreation("a.myshopify.com");
    expect(allowProductCreation("a.myshopify.com")).toBe(false);
  });
});
