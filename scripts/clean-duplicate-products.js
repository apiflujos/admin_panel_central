#!/usr/bin/env node
/**
 * Limpia productos DUPLICADOS del catálogo (los que se duplicaron en Alegra).
 *
 * Patrón del duplicado (determinístico):
 *   - Existe MÁS DE UNA fila con el mismo `name` en la misma tienda, y
 *   - una de ellas tiene una descripción REAL (payload_json->>'description'
 *     con longitud > UMBRAL, normalmente con la marca/contenido), mientras que
 *   - la otra tiene una descripción GENÉRICA/corta (<= UMBRAL, ej. solo el
 *     nombre) y su SKU suele ser un código de barras.
 *
 * Este script BORRA la fila de descripción CORTA (el duplicado) y CONSERVA
 * la de descripción completa (el producto correcto de Alegra con la marca).
 *
 * Seguridad:
 *   - DRY-RUN por defecto: solo cuenta y lista. NO borra.
 *   - Para borrar: --delete --yes.
 *   - Acotable por --store-id=<n>. UMBRAL configurable con --min-desc=<n> (def 30).
 *
 * Uso:
 *   node scripts/clean-duplicate-products.js                    # dry-run global
 *   node scripts/clean-duplicate-products.js --store-id=3       # dry-run tienda 3
 *   node scripts/clean-duplicate-products.js --store-id=3 --delete --yes
 *
 * Lee DATABASE_URL del entorno (.env).
 */
require("dotenv").config();
const { Pool } = require("pg");

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const getVal = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};

const DO_DELETE = has("--delete");
const CONFIRMED = has("--yes");
const storeId = getVal("store-id") != null ? Number(getVal("store-id")) : null;
const MIN_DESC = getVal("min-desc") != null ? Number(getVal("min-desc")) : 30;

if (!process.env.DATABASE_URL) {
  console.error("✗ Falta DATABASE_URL (revisa .env).");
  process.exit(1);
}

// Alcance por tienda (opcional). Aplica a todas las CTEs.
const storeFilter = storeId != null && Number.isFinite(storeId) ? `store_id = ${Number(storeId)}` : `TRUE`;

// Grupos (name) con descripción MIXTA: al menos una real y al menos una genérica.
const GRUPOS = `
  SELECT name
  FROM products
  WHERE ${storeFilter} AND name IS NOT NULL AND name <> ''
  GROUP BY organization_id, name
  HAVING count(*) > 1
     AND max(length(coalesce(payload_json->>'description',''))) > ${MIN_DESC}
     AND min(length(coalesce(payload_json->>'description',''))) <= ${MIN_DESC}
`;

// Filas a borrar: dentro de esos grupos, las de descripción corta.
const A_BORRAR = `
  SELECT p.id
  FROM products p
  JOIN (${GRUPOS}) g ON g.name = p.name
  WHERE ${storeFilter.replace(/store_id/g, "p.store_id")}
    AND length(coalesce(p.payload_json->>'description','')) <= ${MIN_DESC}
`;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("=== Limpieza de productos duplicados (por descripción sin marca) ===");
    console.log(`Umbral de descripción: > ${MIN_DESC} chars = real; <= ${MIN_DESC} = duplicado`);
    console.log(`Alcance: ${storeId != null ? `store_id=${storeId}` : "TODAS las tiendas"}`);
    console.log(`Modo: ${DO_DELETE ? (CONFIRMED ? "BORRAR" : "BORRAR (falta --yes)") : "DRY-RUN (solo conteo)"}`);
    console.log("");

    const countRes = await pool.query(`SELECT count(*)::int AS n FROM (${A_BORRAR}) t`);
    const total = countRes.rows[0].n;
    console.log(`>> Duplicados detectados (a borrar): ${total}`);
    console.log("");

    if (total > 0) {
      const sample = await pool.query(
        `SELECT left(p.name,42) AS nombre, p.sku,
                length(coalesce(p.payload_json->>'description','')) AS len_desc, p.store_id
         FROM products p
         WHERE p.id IN (${A_BORRAR})
         ORDER BY p.name LIMIT 40`
      );
      console.log("Duplicados (hasta 40):");
      sample.rows.forEach((r) =>
        console.log(`  ${r.nombre} | sku=${r.sku || "-"} | len_desc=${r.len_desc} | store=${r.store_id}`)
      );
      console.log("");
    }

    if (!DO_DELETE) {
      console.log("DRY-RUN: no se borró nada. Para borrar: --delete --yes");
      return;
    }
    if (!CONFIRMED) {
      console.log("Falta confirmación. Corre con --delete --yes para borrar.");
      return;
    }
    if (total === 0) {
      console.log("Nada que borrar.");
      return;
    }

    const del = await pool.query(`DELETE FROM products WHERE id IN (${A_BORRAR})`);
    console.log(`✓ Borrados: ${del.rowCount} productos duplicados (se conservó el de descripción completa).`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("✗ Error:", e.message);
  process.exit(1);
});
