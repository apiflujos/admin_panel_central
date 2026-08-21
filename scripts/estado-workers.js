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

    const { rows } = await pool.query(
      `SELECT worker_key, enabled, updated_at, updated_by
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
