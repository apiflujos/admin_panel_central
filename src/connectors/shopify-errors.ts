/**
 * Clasificación de errores de Shopify en PERMANENTES y TRANSITORIOS.
 *
 * Por qué existe este módulo: el sync trataba todos los fallos por igual y los
 * reintentaba para siempre. Cuando el fallo era de esquema — una mutación que
 * ya no existe en la versión de API servida — el reintento no podía funcionar
 * *nunca*, pero el poller volvía a intentarlo cada 15 minutos sobre el catálogo
 * completo y registraba el stack entero de cada ítem. Resultado: 11,3 GB de log
 * en 42 días.
 *
 * La regla es simple: si volver a enviar exactamente la misma petición no puede
 * dar otro resultado, el error es permanente y no se reintenta ni bloquea el
 * checkpoint del poller.
 */

export type ShopifyErrorKind = "permanent" | "transient";

type GraphQlError = {
  message?: string;
  extensions?: { code?: string } | null;
};

type ShopifyRequestErrorInit = {
  status?: number;
  graphQlErrors?: GraphQlError[];
  userErrors?: Array<{ field?: string[] | null; message: string }>;
};

/**
 * Códigos de `extensions.code` que indican que la petición es incompatible con
 * el esquema. Reintentar es inútil: hay que cambiar el código.
 */
const PERMANENT_GRAPHQL_CODES = new Set([
  "undefinedField", // el campo/mutación no existe en esta versión de la API
  "INVALID_VARIABLE", // el tipo de entrada ya no acepta ese campo
  "argumentLiteralsIncompatible",
  "variableMismatch",
  "missingRequiredArguments",
  "ACCESS_DENIED", // faltan scopes: no se arregla reintentando
  "SHOP_INACTIVE",
]);

/**
 * Fragmentos de mensaje que delatan un error de esquema aunque no venga con
 * `extensions.code`. Se comparan en minúsculas.
 *
 * OJO: se comparan contra el mensaje de la API de GraphQL, que Shopify NO
 * localiza. No usar esta táctica con mensajes de cara al usuario.
 */
const PERMANENT_MESSAGE_HINTS = [
  "doesn't exist on type",
  "field is not defined on",
  "is declared by",
  "cannot be queried on",
];

export class ShopifyRequestError extends Error {
  readonly status?: number;
  readonly graphQlErrors?: GraphQlError[];
  readonly userErrors?: Array<{ field?: string[] | null; message: string }>;

  constructor(message: string, init: ShopifyRequestErrorInit = {}) {
    super(message);
    this.name = "ShopifyRequestError";
    this.status = init.status;
    this.graphQlErrors = init.graphQlErrors;
    this.userErrors = init.userErrors;
  }

  get kind(): ShopifyErrorKind {
    return classifyShopifyError(this);
  }

  /**
   * Etiqueta estable para agrupar errores en los logs sin volcar el payload.
   * Permite contar "N ítems fallaron por X" en vez de imprimir N stacks.
   */
  get signature(): string {
    const code = this.graphQlErrors?.find((e) => e?.extensions?.code)?.extensions?.code;
    if (code) return `graphql:${code}`;
    if (this.userErrors?.length) return "userErrors";
    if (typeof this.status === "number") return `http:${this.status}`;
    return "unknown";
  }
}

export function classifyShopifyError(error: unknown): ShopifyErrorKind {
  if (error instanceof ShopifyRequestError) {
    // 429 y 5xx son la definición de transitorio: la misma petición puede
    // funcionar más tarde.
    if (error.status === 429) return "transient";
    if (typeof error.status === "number" && error.status >= 500) return "transient";
    // 401/403 son permanentes hasta que alguien cambie credenciales o scopes.
    if (error.status === 401 || error.status === 403) return "permanent";

    if (error.graphQlErrors?.some((e) => PERMANENT_GRAPHQL_CODES.has(String(e?.extensions?.code || "")))) {
      return "permanent";
    }

    // `userErrors` son validaciones de negocio: el mismo input siempre las produce.
    if (error.userErrors?.length) return "permanent";
  }

  const message = (error instanceof Error ? error.message : String(error || "")).toLowerCase();
  if (PERMANENT_MESSAGE_HINTS.some((hint) => message.includes(hint))) return "permanent";

  // Ante la duda, transitorio: preferimos reintentar de más a descartar un ítem
  // que sí se habría podido sincronizar.
  return "transient";
}

export function isPermanentShopifyError(error: unknown): boolean {
  return classifyShopifyError(error) === "permanent";
}

/**
 * Fallos de integración que tampoco se arreglan reintentando, aunque no vengan
 * de la API de Shopify. Todos se observaron reintentándose en bucle en el
 * retry-queue de producción.
 */
const PERMANENT_INTEGRATION_HINTS = [
  // Violación de índice único: el mismo payload chocará siempre.
  "duplicate key value violates unique constraint",
  // Falta configuración: hasta que alguien la cargue, reintentar no sirve.
  "missing shopify credentials",
  // 400 de Alegra = validación de datos (p. ej. "El departamento es inválido").
  "alegra error (400)",
  "alegra error (401)",
  "alegra error (403)",
  "alegra error (404)",
  "alegra error (422)",
];

/**
 * Versión ampliada de `isPermanentShopifyError` para el retry-queue, que
 * procesa fallos de varias integraciones (Shopify, Alegra, base de datos).
 *
 * Marcar estos como permanentes evita gastar toda la escalera de reintentos y
 * su backoff en algo que no puede cambiar de resultado.
 */
export function isPermanentIntegrationError(error: unknown): boolean {
  if (isPermanentShopifyError(error)) return true;
  const message = (error instanceof Error ? error.message : String(error || "")).toLowerCase();
  return PERMANENT_INTEGRATION_HINTS.some((hint) => message.includes(hint));
}

/** Firma agrupable para cualquier error, no sólo los de Shopify. */
export function errorSignature(error: unknown): string {
  if (error instanceof ShopifyRequestError) return error.signature;
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code) return `node:${code}`;
    return `error:${error.message.slice(0, 80)}`;
  }
  return "unknown";
}
