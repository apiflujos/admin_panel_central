import { describe, expect, it } from "vitest";
import {
  ShopifyRequestError,
  classifyShopifyError,
  errorSignature,
  isPermanentIntegrationError,
  isPermanentShopifyError,
} from "./shopify-errors";

/**
 * Los payloads de esta suite están copiados literalmente del log de producción
 * `becam-workers.err.log` (11,3 GB / 152.724.330 líneas, 2026-07-09 → 2026-08-20).
 * Si la clasificación se rompe, el poller vuelve a reintentar para siempre
 * errores que no pueden funcionar, que es lo que llenó el disco.
 */
describe("classifyShopifyError", () => {
  it("marca como PERMANENTE una mutación que ya no existe en el esquema", () => {
    // ~1.433.557 ocurrencias en producción.
    const error = new ShopifyRequestError(
      'Shopify GraphQL errors: [{"message":"Field \'productVariantUpdate\' doesn\'t exist on type \'Mutation\'"}]',
      {
        status: 200,
        graphQlErrors: [
          {
            message: "Field 'productVariantUpdate' doesn't exist on type 'Mutation'",
            extensions: { code: "undefinedField" },
          },
        ],
      }
    );
    expect(classifyShopifyError(error)).toBe("permanent");
    expect(isPermanentShopifyError(error)).toBe(true);
    expect(errorSignature(error)).toBe("graphql:undefinedField");
  });

  it("marca como PERMANENTE un campo retirado del input", () => {
    // ~993.243 ocurrencias en producción.
    const error = new ShopifyRequestError("Shopify GraphQL errors: [...]", {
      status: 200,
      graphQlErrors: [
        {
          message:
            "Variable $input of type ProductInput! was provided invalid value for variants (Field is not defined on ProductInput)",
          extensions: { code: "INVALID_VARIABLE" },
        },
      ],
    });
    expect(classifyShopifyError(error)).toBe("permanent");
    expect(errorSignature(error)).toBe("graphql:INVALID_VARIABLE");
  });

  it("detecta el error de esquema por el mensaje aunque no venga extensions.code", () => {
    const error = new Error("Field 'productVariantUpdate' doesn't exist on type 'Mutation'");
    expect(classifyShopifyError(error)).toBe("permanent");
  });

  it("trata 429 y 5xx como TRANSITORIOS: la misma petición puede funcionar luego", () => {
    expect(classifyShopifyError(new ShopifyRequestError("rate limited", { status: 429 }))).toBe("transient");
    expect(classifyShopifyError(new ShopifyRequestError("bad gateway", { status: 502 }))).toBe("transient");
    expect(classifyShopifyError(new ShopifyRequestError("boom", { status: 500 }))).toBe("transient");
  });

  it("trata 401/403 como PERMANENTES: no se arreglan reintentando", () => {
    expect(classifyShopifyError(new ShopifyRequestError("unauthorized", { status: 401 }))).toBe("permanent");
    expect(classifyShopifyError(new ShopifyRequestError("forbidden", { status: 403 }))).toBe("permanent");
  });

  it("trata los userErrors como PERMANENTES: son validación del mismo input", () => {
    const error = new ShopifyRequestError("Shopify productSet userErrors: [...]", {
      userErrors: [{ field: ["variants"], message: "Option values are required" }],
    });
    expect(classifyShopifyError(error)).toBe("permanent");
    expect(errorSignature(error)).toBe("userErrors");
  });

  it("ante la duda asume TRANSITORIO, para no descartar ítems recuperables", () => {
    // ~399.307 ocurrencias en producción (agotamiento del pool de Postgres).
    expect(classifyShopifyError(new Error("timeout exceeded when trying to connect"))).toBe("transient");
    expect(classifyShopifyError(new Error("socket hang up"))).toBe("transient");
    expect(classifyShopifyError(undefined)).toBe("transient");
  });

  it("agrupa los errores de red por su código de Node", () => {
    const err = Object.assign(new Error("getaddrinfo ENOTFOUND redis"), { code: "ENOTFOUND" });
    expect(errorSignature(err)).toBe("node:ENOTFOUND");
  });
});

describe("isPermanentIntegrationError", () => {
  it("marca como permanente la violación de índice único", () => {
    // 5.675 ocurrencias, reintentadas en bucle por el retry-queue.
    expect(
      isPermanentIntegrationError(
        new Error('duplicate key value violates unique constraint "products_org_shopify_store_idx"')
      )
    ).toBe(true);
  });

  it("marca como permanente la falta de credenciales", () => {
    expect(isPermanentIntegrationError(new Error("Missing Shopify credentials in DB"))).toBe(true);
  });

  it("marca como permanente un 400 de validación de Alegra", () => {
    expect(
      isPermanentIntegrationError(
        new Error('Alegra error (400) (/contacts): {"code":"1001","message":"El departamento es inválido"}')
      )
    ).toBe(true);
  });

  it("NO marca como permanente un fallo de red", () => {
    expect(isPermanentIntegrationError(new Error("timeout exceeded when trying to connect"))).toBe(false);
    expect(isPermanentIntegrationError(new Error("Alegra error (500)"))).toBe(false);
  });
});
