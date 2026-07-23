#!/usr/bin/env node
/**
 * Limpia productos DUPLICADOS que se trajeron desde Shopify.
 *
 * Contexto: normalmente el catálogo viene de Alegra (descripción con la marca).
 * En algún momento se importaron productos desde Shopify (source='shopify') que
 * DUPLICAN un producto de Alegra ya existente (mismo SKU o referencia). El
 * duplicado trae la descripción de Shopify. Este script los detecta y (opcional)
 * los elimina, conservando SIEMPRE el de Alegra.
 *
 * Un producto se considera duplicado si:
 *   - source = 'shopify', y
 *   - existe OTRO producto source='alegra' con el mismo sku o la misma reference
 *     (en la misma organización).
 *
 * Seguridad:
 *   - DRY-RUN por defecto: solo cuenta y lista. NO borra.
 *   - Para borrar hay que pasar --delete Y --yes.
 *   - Se puede acotar por tienda con --store-id=<n> o --shop-domain=<dominio>.
 *
 * Uso:
 *   node scripts/clean-duplicate-shopify-products.js               # dry-run global
 *   node scripts/clean-duplicate-shopify-products.js --store-id=3  # dry-run tienda 3
 *   node scripts/clean-duplicate-shopify-products.js --delete --yes            # borra (global)
 *   node scripts/clean-duplicate-shopify-products.js --store-id=3 --delete --yes
 *
 * Lee DATABASE_URL del entorno (.env).
 */
require("dotenv").config();
const { Pool } = require("pg");

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const getVal = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};

const DO_DELETE = has("--delete");
const CONFIRMED = has("--yes");
const storeId = getVal("store-id") ? Number(getVal("store-id")) : null;
const shopDomain = getVal("shop-domain");

if (!process.env.DATABASE_URL) {
  console.error("✗ Falta DATABASE_URL (revisa .env).");
  process.exit(1);
}

// Filtro de alcance (tienda) opcional, aplicado al row de Shopify (p).
const scopeClauses = [];
const scopeParams = [];
if (storeId != null && Number.isFinite(storeId)) {
  scopeParams.push(storeId);
  scopeClauses.push(`p.store_id = $${scopeParams.length}`);
}
if (shopDomain) {
  scopeParams.push(shopDomain);
  scopeClauses.push(`p.shop_domain = $${scopeParams.length}`);
}
const scopeSql = scopeClauses.length ? `AND ${scopeClauses.join(" AND ")}` : "";

// Predicado de duplicado: row shopify con un gemelo de Alegra por sku/reference.
const DUP_PREDICATE = `
  p.source = 'shopify'
  ${scopeSql}
  AND EXISTS (
    SELECT 1 FROM products a
    WHERE a.organization_id = p.organization_id
      AND a.source = 'alegra'
      AND a.id <> p.id
      AND (
        (a.sku IS NOT NULL AND a.sku <> '' AND a.sku = p.sku)
        OR (a.reference IS NOT NULL AND a.reference <> '' AND a.reference = p.reference)
      )
  )
`;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("=== Limpieza de productos duplicados desde Shopify ===");
    console.log(`Modo: ${DO_DELETE ? (CONFIRMED ? "BORRAR" : "BORRAR (falta --yes)") : "DRY-RUN (solo conteo)"}`);
    if (storeId != null) console.log(`Alcance: store_id=${storeId}`);
    if (shopDomain) console.log(`Alcance: shop_domain=${shopDomain}`);
    console.log("");

    // Distribución por origen (contexto).
    const bySource = await pool.query(
      `SELECT source, count(*)::int AS n FROM products GROUP BY source ORDER BY n DESC`
    );
    console.log("Productos por origen:");
    bySource.rows.forEach((r) => console.log(`  ${r.source || "(null)"}: ${r.n}`));
    console.log("");

    // Conteo de duplicados.
    const countRes = await pool.query(
      `SELECT count(*)::int AS n FROM products p WHERE ${DUP_PREDICATE}`,
      scopeParams
    );
    const total = countRes.rows[0].n;
    console.log(`>> Duplicados detectados (source='shopify' con gemelo Alegra): ${total}`);
    console.log("");

    if (total > 0) {
      const sample = await pool.query(
        `SELECT p.id, left(p.name, 45) AS nombre, p.sku, p.reference, p.shop_domain, p.store_id
         FROM products p WHERE ${DUP_PREDICATE}
         ORDER BY p.created_at DESC LIMIT 15`,
        scopeParams
      );
      console.log("Muestra (hasta 15):");
      sample.rows.forEach((r) =>
        console.log(`  #${r.id} | ${r.nombre} | sku=${r.sku || "-"} | ref=${r.reference || "-"} | ${r.shop_domain}`)
      );
      console.log("");
    }

    if (!DO_DELETE) {
      console.log("DRY-RUN: no se borró nada. Para borrar: agrega --delete --yes");
      return;
    }
    if (!CONFIRMED) {
      console.log("Falta confirmación. Vuelve a correr con --delete --yes para borrar.");
      return;
    }
    if (total === 0) {
      console.log("Nada que borrar.");
      return;
    }

    const del = await pool.query(
      `DELETE FROM products p WHERE ${DUP_PREDICATE}`,
      scopeParams
    );
    console.log(`✓ Borrados: ${del.rowCount} productos duplicados.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("✗ Error:", err.message);
  process.exit(1);
});
