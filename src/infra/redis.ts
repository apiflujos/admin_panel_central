import Redis from "ioredis";

let redis: Redis | null = null;

/**
 * Ventana de agregación para los errores de conexión de Redis.
 *
 * ioredis reintenta la conexión indefinidamente y emite un evento `error` por
 * cada intento. Con un `REDIS_URL` inalcanzable eso son varios errores por
 * segundo, todos idénticos: en producción llegó a generar ~16,3 millones de
 * líneas (el 65 % de un log de 11 GB). Agregamos por mensaje y emitimos como
 * mucho una línea por ventana, indicando cuántas se suprimieron.
 */
const ERROR_LOG_WINDOW_MS = 60_000;

const errorLogState = new Map<string, { firstAt: number; count: number; loggedAt: number }>();

function logRedisErrorThrottled(err: Error) {
  // El mensaje ya identifica la causa (ENOTFOUND, ECONNREFUSED, ...); el stack
  // de un fallo de conexión no aporta nada y es lo que multiplicaba el volumen.
  const key = err.message || "unknown";
  const now = Date.now();
  const state = errorLogState.get(key);

  if (!state) {
    errorLogState.set(key, { firstAt: now, count: 1, loggedAt: now });
    console.error(`Redis error: ${key}`);
    return;
  }

  state.count += 1;
  if (now - state.loggedAt < ERROR_LOG_WINDOW_MS) return;

  console.error(
    `Redis error: ${key} (${state.count} veces en los últimos ${Math.round((now - state.loggedAt) / 1000)}s)`
  );
  state.loggedAt = now;
  state.count = 0;
}

export function getRedis() {
  if (redis) return redis;
  const url = String(process.env.REDIS_URL || "").trim();
  if (!url) {
    throw new Error("REDIS_URL is required");
  }
  redis = new Redis(url, {
    // BullMQ exige `maxRetriesPerRequest: null`; no lo cambiamos.
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    // Backoff exponencial con techo: sin esto ioredis reintenta cada ~50 ms.
    retryStrategy: (times: number) => Math.min(times * 200, 10_000),
  });
  redis.on("error", logRedisErrorThrottled);
  return redis;
}

/** Sólo para tests: limpia el estado de agregación de logs. */
export function resetRedisErrorLogStateForTests() {
  errorLogState.clear();
}
