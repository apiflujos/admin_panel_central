#!/usr/bin/env node
/**
 * Muestra qué trabajos automáticos están encendidos. SOLO LEE, no cambia nada.
 *
 * Existe para poder comprobar el estado ANTES y DESPUÉS de un despliegue sin
 * confiar en lo que diga el código ni en lo que diga nadie:
 *
 *   node scripts/estado-workers.js
 *
 * Sale con código 1 si hay algún trabajo encendido que MODIFICA las tiendas,
 * para que un despliegue pueda usarlo como comprobación automática.
 */
require("dotenv/config");
const { Pool } = require("pg");

// Los que pueden cambiar precios, existencias o publicaciones de una tienda.
const MODIFICAN_LA_TIENDA = new Set(["products-sync", "inventory-adjustments"]);

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Falta DATABASE_URL en el entorno.");
    process.exit(2);
  }
  const pool = new Pool({ connectionString });
  try {
    const existe = await pool.query(
      `SELECT to_regclass('public.worker_settings') IS NOT NULL AS existe`
    );
    if (!existe.rows[0]?.existe) {
      console.log("La tabla worker_settings NO existe todavía: faltan migraciones.");
      console.log("Mientras no exista, NINGÚN trabajo corre (el código falla cerrado).");
      process.exit(0);
    }

    // La salud sólo existe desde la migración 024. Se comprueba en vez de
    // asumirla: este script corre en el despliegue y no puede reventar si se
    // ejecuta contra una base más vieja.
    const conSalud = await pool.query(
      `SELECT 1 AS existe FROM information_schema.columns
        WHERE table_name = 'worker_settings' AND column_name = 'fallos_seguidos'`
    );
    const hayColumnasDeSalud = Boolean(conSalud.rows[0]?.existe);

    const { rows } = await pool.query(
      `SELECT worker_key, enabled, updated_at, updated_by${
        hayColumnasDeSalud ? ", fallos_seguidos, ultimo_error, ultima_ejecucion_at, ultimo_exito_at" : ""
      }
       FROM worker_settings ORDER BY enabled DESC, worker_key ASC`
    );

    if (!rows.length) {
      console.log("La tabla existe pero está VACÍA. Revisa que la migración 019 se aplicara.");
      process.exit(2);
    }

    const peligrosos = rows.filter((r) => r.enabled && MODIFICAN_LA_TIENDA.has(r.worker_key));

    console.log("");
    console.log("  TRABAJO                        ESTADO      MODIFICA TIENDA   ÚLTIMO CAMBIO");
    console.log("  " + "-".repeat(88));
    for (const row of rows) {
      const modifica = MODIFICAN_LA_TIENDA.has(row.worker_key);
      console.log(
        "  " +
          row.worker_key.padEnd(30) +
          (row.enabled ? "ENCENDIDO " : "apagado   ").padEnd(12) +
          (modifica ? "SÍ" : "no").padEnd(18) +
          `${new Date(row.updated_at).toISOString().slice(0, 19).replace("T", " ")}` +
          (row.updated_by ? ` · ${row.updated_by}` : "")
      );
    }
    console.log("");
    console.log(`  Encendidos: ${rows.filter((r) => r.enabled).length} de ${rows.length}`);

    // AVERÍAS. Esto se imprime en cada despliegue a propósito: `log-retention`
    // falló unas 120 veces durante un mes y nadie lo vio porque su único
    // testigo era un fichero de log.
    if (hayColumnasDeSalud) {
      const averiados = rows.filter((r) => r.enabled && Number(r.fallos_seguidos || 0) >= 3);
      if (averiados.length) {
        console.log("");
        console.log(`  AVERIADOS: ${averiados.length} trabajo(s) encendido(s) llevan varias pasadas FALLANDO:`);
        for (const row of averiados) {
          const desde = row.ultimo_exito_at
            ? `funcionó por última vez el ${new Date(row.ultimo_exito_at).toISOString().slice(0, 19).replace("T", " ")}`
            : "no consta que haya funcionado nunca";
          console.log(`     - ${row.worker_key}: ${row.fallos_seguidos} fallos seguidos, ${desde}`);
          if (row.ultimo_error) console.log(`       ${String(row.ultimo_error).slice(0, 160)}`);
        }
        console.log("  Míralos en Super Admin → Trabajos antes de dar el despliegue por bueno.");
      } else {
        console.log("  Ningún trabajo encendido está fallando.");
      }
    }

    if (peligrosos.length) {
      console.log("");
      console.log(`  ATENCIÓN: ${peligrosos.length} trabajo(s) encendido(s) MODIFICAN las tiendas:`);
      for (const row of peligrosos) console.log(`     - ${row.worker_key}`);
      console.log("  Si no es intencionado, apágalos en Super Admin antes de seguir.");
      process.exit(1);
    }

    console.log("  Ningún trabajo encendido modifica las tiendas.");
    process.exit(0);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

run().catch((error) => {
  console.error("No se pudo leer el estado:", error && error.message ? error.message : error);
  process.exit(2);
});
