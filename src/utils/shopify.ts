const ENV_DEFAULT = (process.env.SHOPIFY_API_VERSION || "").trim();

/**
 * Versión estable de la Admin API contra la que está escrito este código.
 *
 * IMPORTANTE — por qué esto importa más de lo que parece:
 * Shopify soporta cada versión ~12 meses. Cuando una app pide una versión ya
 * retirada, la petición NO falla: Shopify "cae hacia adelante" y la sirve con
 * la versión estable soportada más antigua.
 *   https://shopify.dev/docs/api/usage/versioning
 *
 * Eso hace que el desfase sea invisible hasta que una mutación desaparece del
 * esquema. Fue exactamente lo que pasó en producción: el código pedía "2024-04"
 * (retirada), Shopify servía una versión moderna y `productVariantUpdate` y
 * `ProductInput.variants` respondían `undefinedField` / `INVALID_VARIABLE`.
 *
 * Al subir esta constante hay que revisar las mutaciones de `connectors/shopify.ts`
 * contra el changelog de la versión destino.
 */
export const DEFAULT_SHOPIFY_API_VERSION = ENV_DEFAULT || "2026-07";

const API_VERSION_PATTERN = /^\d{4}-\d{2}$/;

export function resolveShopifyApiVersion(version?: string | null) {
  const trimmed = String(version || "").trim();
  const resolved = trimmed || DEFAULT_SHOPIFY_API_VERSION;
  if (!API_VERSION_PATTERN.test(resolved) && resolved !== "unstable") {
    throw new Error(
      `SHOPIFY_API_VERSION inválida: "${resolved}". Formato esperado YYYY-MM (ej. ${DEFAULT_SHOPIFY_API_VERSION}).`
    );
  }
  return resolved;
}

const versionMismatchLogged = new Set<string>();

/**
 * Compara la versión pedida con la que Shopify declara haber usado
 * (`X-Shopify-API-Version`). Si difieren, la app está anclada a una versión
 * inaccesible y está corriendo sobre un esquema que no es el que espera.
 *
 * Se registra una vez por combinación tienda+versión para no inundar el log:
 * este aviso se dispararía en cada petición.
 */
export function assertShopifyApiVersionMatches(
  requested: string,
  servedRaw: string | null | undefined,
  context: { shopDomain?: string } = {}
) {
  const served = String(servedRaw || "").trim();
  if (!served || served === requested) return;

  const key = `${context.shopDomain || "?"}:${requested}->${served}`;
  if (versionMismatchLogged.has(key)) return;
  versionMismatchLogged.add(key);

  console.error(
    `[shopify] DESFASE DE VERSIÓN: se pidió ${requested} pero Shopify sirvió ${served}` +
      (context.shopDomain ? ` (tienda ${context.shopDomain})` : "") +
      ". La versión pedida ya no está soportada; el esquema real puede no coincidir " +
      "con el que espera este código. Actualiza DEFAULT_SHOPIFY_API_VERSION."
  );
}

/** Sólo para tests. */
export function resetShopifyVersionWarningsForTests() {
  versionMismatchLogged.clear();
}
