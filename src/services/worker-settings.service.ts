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
  /** Salud: si un trabajo falla, tiene que verse sin abrir un log. */
  ultimaEjecucion: string | null;
  ultimoResultado: "ok" | "fallo" | null;
  ultimoError: string | null;
  ultimoExito: string | null;
  fallosSeguidos: number;
  /** Está averiado: falla una y otra vez, no fue un tropiezo suelto. */
  averiado: boolean;
};

type Row = {
  worker_key: string;
  enabled: boolean;
  updated_at: Date | string;
  updated_by: string | null;
  ultima_ejecucion_at: Date | null;
  ultimo_resultado: string | null;
  ultimo_error: string | null;
  ultimo_exito_at: Date | null;
  fallos_seguidos: number;
};

/**
 * A partir de cuántos fallos seguidos se considera averiado.
 *
 * Uno suelto es ruido (un reinicio, un timeout). Tres seguidos ya no lo es, y
 * es lo que habría delatado a `log-retention` en las primeras horas en vez de
 * al cabo de un mes.
 */
export const FALLOS_PARA_AVERIA = 3;

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
  const result = await pool.query<Row>(
    `SELECT worker_key, enabled, updated_at, updated_by,
            ultima_ejecucion_at, ultimo_resultado, ultimo_error, ultimo_exito_at, fallos_seguidos
       FROM worker_settings`
  );
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
      ultimaEjecucion: row?.ultima_ejecucion_at ? new Date(row.ultima_ejecucion_at).toISOString() : null,
      ultimoResultado:
        row?.ultimo_resultado === "ok" || row?.ultimo_resultado === "fallo" ? row.ultimo_resultado : null,
      ultimoError: row?.ultimo_error ?? null,
      ultimoExito: row?.ultimo_exito_at ? new Date(row.ultimo_exito_at).toISOString() : null,
      fallosSeguidos: Number(row?.fallos_seguidos || 0),
      averiado: Number(row?.fallos_seguidos || 0) >= FALLOS_PARA_AVERIA,
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

/**
 * Deja constancia de cómo terminó una pasada de un trabajo.
 *
 * Se guarda en la base de datos, no en un log: sobrevive a los reinicios y a
 * la rotación de ficheros. `log-retention` falló ~120 veces sin que nadie lo
 * viera precisamente porque su único testigo era un `console.error`.
 *
 * NUNCA lanza. Si registrar la salud fallara y tumbara el trabajo, el remedio
 * sería peor que la enfermedad.
 */
export async function registrarEjecucionTrabajo(key: string, ok: boolean, error?: unknown) {
  if (!isWorkerKey(key)) return;
  const detalle = ok ? null : (error instanceof Error ? error.message : String(error ?? "error")).slice(0, 2000);
  try {
    await getPool().query(
      `
      UPDATE worker_settings
         SET ultima_ejecucion_at = NOW(),
             ultimo_resultado = $2,
             ultimo_error = $3,
             ultimo_exito_at = CASE WHEN $2 = 'ok' THEN NOW() ELSE ultimo_exito_at END,
             -- Vuelve a cero en cuanto una pasada termina bien: lo que importa
             -- es si está roto AHORA, no cuántas veces falló en su vida.
             fallos_seguidos = CASE WHEN $2 = 'ok' THEN 0 ELSE fallos_seguidos + 1 END
       WHERE worker_key = $1
      `,
      [key, ok ? "ok" : "fallo", detalle]
    );
  } catch (e) {
    console.error(`[salud] no se pudo registrar la ejecución de ${key}:`, e instanceof Error ? e.message : e);
  }
}

/**
 * Envuelve la pasada de un trabajo para que su resultado quede registrado.
 *
 * Que un trabajo falle en silencio deja de ser posible: pase lo que pase, la
 * base de datos sabe cómo terminó y desde cuándo.
 */
export async function conRegistroDeSalud<T>(key: string, tarea: () => Promise<T>): Promise<T | undefined> {
  // Un trabajo APAGADO no registra nada.
  //
  // Si registrara "ok" en cada tick, apagar un trabajo averiado pisaría su
  // `ultimo_exito_at` y parecería que acaba de funcionar. Justo la pregunta
  // que esto existe para responder —«¿desde cuándo está roto?»— quedaría
  // falseada por el propio acto de apagarlo.
  // `isWorkerEnabled` exige una clave del catálogo; una desconocida no puede
  // correr ni registrarse.
  if (!isWorkerKey(key)) return undefined;
  if (!(await isWorkerEnabled(key))) return undefined;
  try {
    const resultado = await tarea();
    await registrarEjecucionTrabajo(key, true);
    return resultado;
  } catch (error) {
    console.error(`[${key}] la pasada falló:`, error instanceof Error ? error.message : error);
    await registrarEjecucionTrabajo(key, false, error);
    return undefined;
  }
}
