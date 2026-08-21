import { getPool } from "../db";
import {
  WORKER_CATALOG,
  getWorkerDefinition,
  isWorkerKey,
  type WorkerDefinition,
  type WorkerKey,
} from "../../packages/shared/src/workers";

export type WorkerSetting = WorkerDefinition & {
  enabled: boolean;
  /** true si el estado viene del catálogo porque nadie lo ha tocado. */
  isDefault: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

type Row = { worker_key: string; enabled: boolean; updated_at: Date | string; updated_by: string | null };

/**
 * Caché de lectura para el bucle de los workers.
 *
 * Sin ella cada tick de cada worker haría su propia consulta. Con un TTL corto
 * el interruptor de la UI surte efecto en segundos sin reiniciar el proceso,
 * que es justamente lo que se pidió.
 */
const CACHE_TTL_MS = 10_000;
let cache: { at: number; value: Map<string, boolean> } | null = null;

/** Deja constancia en el log SOLO cuando el estado cambia, no en cada tick. */
const ultimoEstadoLogueado = new Map<string, boolean>();

export function resetWorkerSettingsCacheForTests() {
  cache = null;
  ultimoEstadoLogueado.clear();
}

async function loadEnabledMap(): Promise<Map<string, boolean>> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  const pool = getPool();
  const result = await pool.query<Row>(`SELECT worker_key, enabled, updated_at, updated_by FROM worker_settings`);
  const map = new Map<string, boolean>();
  for (const definition of WORKER_CATALOG) map.set(definition.key, definition.enabledByDefault);
  for (const row of result.rows) {
    if (isWorkerKey(row.worker_key)) map.set(row.worker_key, Boolean(row.enabled));
  }
  cache = { at: now, value: map };
  return map;
}

/**
 * ¿Puede correr este worker?
 *
 * Ante un fallo de base responde NO. Es deliberado: los workers que escriben en
 * la tienda ya causaron un incidente de producción, y arrancar «por si acaso»
 * cuando no se puede confirmar el permiso es exactamente el error que no se
 * puede repetir. Si la base no responde, el worker tampoco tendría con qué
 * trabajar.
 */
export async function isWorkerEnabled(key: WorkerKey): Promise<boolean> {
  let enabled: boolean;
  try {
    const map = await loadEnabledMap();
    enabled = map.get(key) ?? getWorkerDefinition(key).enabledByDefault;
  } catch (error) {
    console.error(
      `[workers] no se pudo leer el interruptor de "${key}": se ASUME APAGADO.`,
      error instanceof Error ? error.message : error
    );
    enabled = false;
  }

  if (ultimoEstadoLogueado.get(key) !== enabled) {
    ultimoEstadoLogueado.set(key, enabled);
    console.log(`[workers] "${key}" queda ${enabled ? "ENCENDIDO" : "APAGADO"}.`);
  }
  return enabled;
}

export async function listWorkerSettings(): Promise<WorkerSetting[]> {
  const pool = getPool();
  const result = await pool.query<Row>(`SELECT worker_key, enabled, updated_at, updated_by FROM worker_settings`);
  const rows = new Map<string, Row>(
    result.rows.filter((row) => isWorkerKey(row.worker_key)).map((row) => [row.worker_key, row] as const)
  );

  return WORKER_CATALOG.map((definition) => {
    const row = rows.get(definition.key);
    return {
      ...definition,
      enabled: row ? Boolean(row.enabled) : definition.enabledByDefault,
      isDefault: !row,
      updatedAt: row ? new Date(row.updated_at).toISOString() : null,
      updatedBy: row?.updated_by ?? null,
    };
  });
}

export async function setWorkerEnabled(key: string, enabled: boolean, actor?: string | null) {
  if (!isWorkerKey(key)) throw new Error(`worker desconocido: ${key}`);
  const pool = getPool();
  await pool.query(
    `
    INSERT INTO worker_settings (worker_key, enabled, updated_at, updated_by)
    VALUES ($1, $2, NOW(), $3)
    ON CONFLICT (worker_key)
    DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW(), updated_by = EXCLUDED.updated_by
    `,
    [key, Boolean(enabled), actor ? String(actor).slice(0, 200) : null]
  );
  // El cambio debe verse ya, sin esperar a que venza el TTL.
  cache = null;
  const definition = getWorkerDefinition(key);
  console.log(
    `[workers] "${key}" (${definition.label}) pasa a ${enabled ? "ENCENDIDO" : "APAGADO"}` +
      ` por ${actor || "desconocido"}.`
  );
  return { ok: true, key, enabled: Boolean(enabled) };
}
