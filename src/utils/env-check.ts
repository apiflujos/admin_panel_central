/**
 * Validación de env vars al startup.
 *
 * Filosofía:
 *  - SOLO se hace fail-fast por env vars sin las cuales NADA en la app puede funcionar
 *    (DATABASE_URL, CRYPTO_KEY_BASE64). Todas las demás son warnings — el server arranca
 *    y las features que las requieran fallan explícitamente cuando se usan.
 *
 *  - Las credenciales POR TENANT (access_token Shopify, API key Alegra, consumer key Woo)
 *    NUNCA se leen de env vars: se cargan desde el wizard de conexiones y se guardan
 *    cifradas en DB. No hay nada que validar acá para ellas.
 *
 *  - Las credenciales de LA APP Shopify (SHOPIFY_API_KEY/SECRET/SCOPES + APP_HOST) solo
 *    se necesitan si el operador va a usar el flow OAuth desde el wizard. Si prefiere el
 *    flow "token manual" (pegar un access_token de una custom app de la tienda), no hacen
 *    falta. Por eso son warning, no fail.
 */

import { validateEnvFormats } from "../config/env";

const isProd = () => String(process.env.NODE_ENV || "").toLowerCase() === "production";

// Sin estas la app literalmente no puede persistir nada — fail-fast.
const HARD_REQUIRED = ["DATABASE_URL", "CRYPTO_KEY_BASE64"] as const;

// App Shopify (para OAuth flow desde el wizard). Sin ellas el modo OAuth no funciona,
// pero el modo "token manual" sí. Warning, no fail.
const SHOPIFY_OAUTH_ENV = ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SHOPIFY_SCOPES", "APP_HOST"] as const;

// Solo para deploys que reciben webhooks Shopify directos.
const SHOPIFY_WEBHOOK_ENV = ["SHOPIFY_WEBHOOK_SECRET"] as const;

const RECOMMENDED_FOR_PROD = [
  "APP_ORG_ID",
  "RETRY_QUEUE_POLL_MS",
  "MARKETING_CRON_TIMEZONE",
  "SYNC_ORDERS_MAX_BULK",
] as const;

function isSet(name: string): boolean {
  const raw = process.env[name];
  return typeof raw === "string" && raw.trim().length > 0;
}

export function assertStartupEnv(_options: { requireShopifyOAuth?: boolean } = {}) {
  const missingHard: string[] = [];
  for (const key of HARD_REQUIRED) {
    if (!isSet(key)) missingHard.push(key);
  }

  if (missingHard.length) {
    throw new Error(
      `Missing required environment variables: ${missingHard.join(", ")}. ` +
        `Estas son las únicas sin las que la app no arranca. ` +
        `Ver .env.example y docs/DEPLOY.md para el resto (opcionales / por feature).`
    );
  }

  // Validación de FORMATO (Zod) de las env presentes: detecta valores mal
  // formados (clave AES no-base64, DATABASE_URL no-postgres, email/URL inválidos)
  // al arranque, en vez de fallar en runtime. No bloquea (solo avisa).
  const formatIssues = validateEnvFormats();
  if (formatIssues.length) {
    console.warn(`[env-check] Formato inválido en env: ${formatIssues.join("; ")}`);
  }

  // Todo lo demás es warning informativo.
  const missingOAuth = SHOPIFY_OAUTH_ENV.filter((k) => !isSet(k));
  if (missingOAuth.length) {
    console.info(
      `[env-check] Shopify OAuth desactivado — faltan: ${missingOAuth.join(", ")}. ` +
        `El wizard puede seguir conectando tiendas mediante "token manual" (custom app).`
    );
  }

  if (isProd()) {
    const missingWebhook = SHOPIFY_WEBHOOK_ENV.filter((k) => !isSet(k));
    if (missingWebhook.length) {
      // OJO: este aviso NO significa que los webhooks fallen.
      //
      // El secreto de la app de Shopify se guarda CIFRADO EN BASE DE DATOS, por
      // tienda (`credentials.provider = 'shopify_oauth_app:store:<id>'`), y la
      // verificación de HMAC lo resuelve en este orden:
      //     tienda -> global en BD -> env -> ninguno
      // (ver `shopify-app-credentials.service.ts` y `utils/webhook.ts`).
      // El env es el ÚLTIMO recurso, no la fuente principal.
      //
      // La redacción anterior afirmaba que los webhooks "serán rechazados por
      // HMAC inválido", lo cual es falso cuando las credenciales están en BD —
      // y llevó a diagnosticar como avería activa lo que era ruido de arranque.
      console.info(
        `[env-check] ${missingWebhook.join(", ")} no está en el entorno. Es lo normal: ` +
          `el secreto se toma de las credenciales por tienda en base de datos. ` +
          `Sólo importa si una tienda no tiene credenciales cargadas — revísalo en Configuración, no aquí.`
      );
    }

    const missingRecommended = RECOMMENDED_FOR_PROD.filter((k) => !isSet(k));
    if (missingRecommended.length) {
      console.info(
        `[env-check] Variables recomendadas sin setear en producción: ${missingRecommended.join(", ")}. ` +
          `Usando defaults — considerá setearlas explícitamente.`
      );
    }

    if (String(process.env.ALLOW_UNVERIFIED_SHOPIFY_WEBHOOKS || "").toLowerCase() === "true") {
      console.warn(
        `[env-check] ALLOW_UNVERIFIED_SHOPIFY_WEBHOOKS=true está seteado en producción — será ignorado por seguridad.`
      );
    }
    if (String(process.env.ALLOW_INTERNAL_HOSTS || "").toLowerCase() === "true") {
      console.warn(
        `[env-check] ALLOW_INTERNAL_HOSTS=true está seteado en producción — permite SSRF a red interna, revisá si es intencional.`
      );
    }
  }
}
