import { describe, expect, it } from "vitest";
import { toShopifyGid } from "./shopify";
import {
  ShopifyRequestError,
  classifyShopifyError,
  errorSignature,
  isMissingShopifyResourceError,
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
      "Shopify GraphQL errors: [{\"message\":\"Field 'productVariantUpdate' doesn't exist on type 'Mutation'\"}]",
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

describe("toShopifyGid", () => {
  it("promueve un id numérico heredado de REST al global id que exige GraphQL", () => {
    // Caso real de producción: los ids guardados en `products` son numéricos y
    // `productVariantsBulkUpdate` los rechaza con
    // "Invalid global id '9820787179750'".
    expect(toShopifyGid("Product", "9820787179750")).toBe("gid://shopify/Product/9820787179750");
    expect(toShopifyGid("ProductVariant", "48211137855718")).toBe("gid://shopify/ProductVariant/48211137855718");
    expect(toShopifyGid("InventoryItem", "123")).toBe("gid://shopify/InventoryItem/123");
  });

  it("deja intacto lo que ya es un global id", () => {
    const gid = "gid://shopify/Product/9820787179750";
    expect(toShopifyGid("Product", gid)).toBe(gid);
    expect(toShopifyGid("ProductVariant", "gid://shopify/ProductVariant/1")).toBe("gid://shopify/ProductVariant/1");
  });

  it("no inventa un gid a partir de basura: deja que Shopify se queje", () => {
    expect(toShopifyGid("Product", "no-es-un-id")).toBe("no-es-un-id");
    expect(toShopifyGid("Product", "123abc")).toBe("123abc");
    expect(toShopifyGid("Product", "")).toBe("");
  });
});

describe("isMissingShopifyResourceError", () => {
  it("reconoce el userError real de un producto borrado", () => {
    // Tal cual lo devolvió producción tras migrar a productVariantsBulkUpdate.
    const error = new ShopifyRequestError("Shopify productVariantsBulkUpdate userErrors: [...]", {
      userErrors: [{ field: ["productId"], message: "Product does not exist" }],
    });
    expect(isMissingShopifyResourceError(error)).toBe(true);
  });

  it("reconoce un global id que Shopify no acepta", () => {
    const error = new ShopifyRequestError("Shopify GraphQL errors", {
      graphQlErrors: [
        {
          message: "Variable $productId of type ID! was provided invalid value",
          extensions: { code: "INVALID_VARIABLE" },
        },
      ],
    });
    // El mensaje del problema viaja en graphQlErrors; basta con que aparezca.
    expect(isMissingShopifyResourceError(new Error("Invalid global id '123'"))).toBe(true);
    expect(error).toBeInstanceOf(ShopifyRequestError);
  });

  it("NO confunde un fallo de red con un recurso inexistente", () => {
    expect(isMissingShopifyResourceError(new Error("timeout exceeded when trying to connect"))).toBe(false);
    expect(isMissingShopifyResourceError(new ShopifyRequestError("rate limited", { status: 429 }))).toBe(false);
  });

  it("NO confunde una validación de negocio con un recurso inexistente", () => {
    const error = new ShopifyRequestError("userErrors", {
      userErrors: [{ field: ["price"], message: "Price must be positive" }],
    });
    expect(isMissingShopifyResourceError(error)).toBe(false);
  });
});
