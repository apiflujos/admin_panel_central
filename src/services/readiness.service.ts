import { getPool } from "../db";
import { getRedis } from "../infra/redis";

async function conTimeout<T>(promise: Promise<T>, timeoutMs: number, componente: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${componente} timeout`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function checkReadiness(timeoutMs = 2_000) {
  const checks: Record<string, { ok: boolean; error?: string }> = {};

  try {
    const result = await conTimeout(
      getPool().query<{ migrations: string | null; workers: string | null; runtime_heartbeat: string | null }>(
        `SELECT to_regclass('public.schema_migrations')::text AS migrations,
                to_regclass('public.worker_settings')::text AS workers,
                to_regclass('public.worker_runtime_heartbeat')::text AS runtime_heartbeat`
      ),
      timeoutMs,
      "postgres"
    );
    const row = result.rows[0];
    if (!row?.migrations || !row?.workers || !row?.runtime_heartbeat) {
      throw new Error("faltan migraciones obligatorias");
    }
    checks.postgres = { ok: true };
  } catch (error) {
    checks.postgres = { ok: false, error: error instanceof Error ? error.message : "no disponible" };
  }

  if (checks.postgres.ok) {
    try {
      const heartbeat = await conTimeout(
        getPool().query<{ fresco: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM worker_runtime_heartbeat
              WHERE runtime_key = 'becam-workers'
                AND heartbeat_at > NOW() - INTERVAL '2 minutes'
           ) AS fresco`
        ),
        timeoutMs,
        "workers"
      );
      if (!heartbeat.rows[0]?.fresco) throw new Error("el runtime de workers no tiene un latido reciente");
      checks.workers = { ok: true };
    } catch (error) {
      checks.workers = { ok: false, error: error instanceof Error ? error.message : "no disponible" };
    }
  } else {
    checks.workers = { ok: false, error: "no se pudo comprobar sin Postgres" };
  }

  try {
    const pong = await conTimeout(getRedis().ping(), timeoutMs, "redis");
    if (pong !== "PONG") throw new Error(`respuesta inesperada: ${pong}`);
    checks.redis = { ok: true };
  } catch (error) {
    checks.redis = { ok: false, error: error instanceof Error ? error.message : "no disponible" };
  }

  return { ready: Object.values(checks).every((check) => check.ok), checks };
}
