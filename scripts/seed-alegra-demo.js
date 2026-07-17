/*
 * Seed local DB with REAL Alegra data (items + invoices) for a demo.
 *
 * Usage (PowerShell):
 *   $env:ALEGRA_SEED_EMAIL="becamdistribuciones@gmail.com"
 *   $env:ALEGRA_SEED_TOKEN="<token>"
 *   node scripts/seed-alegra-demo.js
 *
 * Reads DATABASE_URL from .env. Inserts into public.products and public.orders
 * (org 1, shop_domain '') using the same unique keys the app relies on, so the
 * rows show up in the admin panel exactly like synced Alegra records.
 */
require("dotenv").config();
const { Pool } = require("pg");

const EMAIL = process.env.ALEGRA_SEED_EMAIL;
const TOKEN = process.env.ALEGRA_SEED_TOKEN;
const BASE = (process.env.ALEGRA_SEED_BASE || "https://api.alegra.com/api/v1").replace(/\/$/, "");
const ORG_ID = Number(process.env.APP_ORG_ID || "1");
const SHOP_DOMAIN = process.env.ALEGRA_SEED_SHOP_DOMAIN || "";
const TARGET = Number(process.env.ALEGRA_SEED_COUNT || "50");
const PAGE = 30; // Alegra caps limit at 30 per request

if (!EMAIL || !TOKEN) {
  console.error("Missing ALEGRA_SEED_EMAIL / ALEGRA_SEED_TOKEN env vars.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL (check .env).");
  process.exit(1);
}

const AUTH = "Basic " + Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");

async function alegraGet(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: AUTH, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Alegra ${path} -> HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchAll(resource, target) {
  const out = [];
  let start = 0;
  while (out.length < target) {
    const batch = await alegraGet(`/${resource}?limit=${PAGE}&start=${start}&order_field=id&order_direction=DESC`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < PAGE) break;
    start += PAGE;
  }
  return out.slice(0, target);
}

function itemQuantity(item) {
  const inv = item && item.inventory;
  if (!inv) return null;
  const q = inv.availableQuantity;
  return q === undefined || q === null ? null : Number(q);
}

function itemWarehouses(item) {
  const wh = item && item.inventory && item.inventory.warehouses;
  if (!Array.isArray(wh)) return null;
  const ids = wh.map((w) => String(w.id)).filter(Boolean);
  return ids.length ? ids : null;
}

function invoiceSummary(inv) {
  const items = inv && inv.items;
  if (!Array.isArray(items) || !items.length) return null;
  return items
    .slice(0, 20)
    .map((i) => `${i.name || i.description || "item"} x${i.quantity ?? 1}`)
    .join(", ");
}

async function seedItems(pool) {
  const items = await fetchAll("items", TARGET);
  console.log(`Fetched ${items.length} Alegra items.`);
  let n = 0;
  for (const it of items) {
    await pool.query(
      `INSERT INTO products
         (organization_id, shop_domain, source, alegra_item_id, name, reference, sku,
          status_alegra, inventory_quantity, warehouse_ids, source_updated_at,
          sync_status, last_sync_at, payload_json, created_at, updated_at)
       VALUES ($1,$2,'alegra',$3,$4,$5,$6,$7,$8,$9,NOW(),'synced',NOW(),$10,NOW(),NOW())
       ON CONFLICT (organization_id, shop_domain, alegra_item_id) DO UPDATE SET
         name=EXCLUDED.name, reference=EXCLUDED.reference, sku=EXCLUDED.sku,
         status_alegra=EXCLUDED.status_alegra, inventory_quantity=EXCLUDED.inventory_quantity,
         warehouse_ids=EXCLUDED.warehouse_ids, payload_json=EXCLUDED.payload_json,
         sync_status='synced', last_sync_at=NOW(), updated_at=NOW()`,
      [
        ORG_ID,
        SHOP_DOMAIN,
        String(it.id),
        it.name || null,
        it.reference || null,
        it.reference || null,
        it.status || null,
        itemQuantity(it),
        itemWarehouses(it),
        JSON.stringify(it),
      ]
    );
    n++;
  }
  console.log(`Upserted ${n} products.`);
  return n;
}

async function seedInvoices(pool) {
  const invoices = await fetchAll("invoices", TARGET);
  console.log(`Fetched ${invoices.length} Alegra invoices.`);
  let n = 0;
  for (const inv of invoices) {
    const number =
      (inv.numberTemplate && (inv.numberTemplate.fullNumber || inv.numberTemplate.formattedNumber || inv.numberTemplate.number)) ||
      (inv.number != null ? String(inv.number) : null);
    await pool.query(
      `INSERT INTO orders
         (organization_id, shop_domain, source, alegra_invoice_id, invoice_number,
          customer_name, customer_email, products_summary, processed_at, status,
          alegra_status, total, currency, source_updated_at,
          sync_status, last_sync_at, created_at, updated_at)
       VALUES ($1,$2,'alegra',$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$8,'synced',NOW(),NOW(),NOW())
       ON CONFLICT (organization_id, shop_domain, alegra_invoice_id) DO UPDATE SET
         invoice_number=EXCLUDED.invoice_number, customer_name=EXCLUDED.customer_name,
         customer_email=EXCLUDED.customer_email, products_summary=EXCLUDED.products_summary,
         processed_at=EXCLUDED.processed_at, status=EXCLUDED.status, alegra_status=EXCLUDED.alegra_status,
         total=EXCLUDED.total, currency=EXCLUDED.currency,
         sync_status='synced', last_sync_at=NOW(), updated_at=NOW()`,
      [
        ORG_ID,
        SHOP_DOMAIN,
        String(inv.id),
        number,
        (inv.client && inv.client.name) || null,
        (inv.client && inv.client.email) || null,
        invoiceSummary(inv),
        inv.date || null,
        inv.status || null,
        inv.total != null ? Number(inv.total) : null,
        "COP",
      ]
    );
    n++;
  }
  console.log(`Upserted ${n} orders (invoices).`);
  return n;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`INSERT INTO organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      ORG_ID,
      `Org ${ORG_ID}`,
    ]);
    const items = await seedItems(pool);
    const invoices = await seedInvoices(pool);
    console.log(`\nDONE: ${items} items + ${invoices} invoices seeded into org ${ORG_ID} (shop_domain='${SHOP_DOMAIN}').`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("SEED FAILED:", e.message);
  process.exit(1);
});
