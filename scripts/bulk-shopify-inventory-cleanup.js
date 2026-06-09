/**
 * bulk-shopify-inventory-cleanup.js
 *
 * Procesa el Excel "Actualizacion Masiva Inventarios Shopify.xlsx" y aplica
 * en Shopify las tres acciones definidas en la columna "Accion":
 *
 *   Actualizar      → actualiza inventario "on hand" al valor "REAL Alegra"
 *   Pasar a Borrador → cambia status del producto a DRAFT
 *   Borrar           → elimina el producto de Shopify (IRREVERSIBLE)
 *
 * USO:
 *   # Siempre primero sin --apply para revisar el plan
 *   SHOPIFY_DOMAIN=xxx.myshopify.com SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_xxx \
 *     node scripts/bulk-shopify-inventory-cleanup.js [--phase <fase>]
 *
 *   # Aplicar cambios (requiere --apply; para borrar también --confirm-delete)
 *   SHOPIFY_DOMAIN=... SHOPIFY_ADMIN_API_ACCESS_TOKEN=... \
 *     node scripts/bulk-shopify-inventory-cleanup.js --apply [--confirm-delete] [--phase <fase>]
 *
 * FASES (--phase): actualizar | borrador | borrar | all (default: all)
 *
 * OUTPUT: docuemntos/bulk-cleanup-log-<timestamp>.tsv
 */

const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const API_VERSION = "2024-04";
const EXCEL_PATH = path.resolve(
  __dirname,
  "../docuemntos/Actualizacion Masiva Inventarios Shopify.xlsx"
);
const LOCATION_NAME = "Oliva Shoes";

// --- CLI flags ---
const APPLY = process.argv.includes("--apply");
const CONFIRM_DELETE = process.argv.includes("--confirm-delete");
const phaseArg = (() => {
  const i = process.argv.indexOf("--phase");
  return i !== -1 ? process.argv[i + 1] : "all";
})();
const RUN_ACTUALIZAR = phaseArg === "all" || phaseArg === "actualizar";
const RUN_BORRADOR = phaseArg === "all" || phaseArg === "borrador";
const RUN_BORRAR = phaseArg === "all" || phaseArg === "borrar";

// Minimum points to keep in the throttle bucket before sleeping
const THROTTLE_BUFFER = 100;
// Max ms to sleep when throttled
const MAX_THROTTLE_SLEEP_MS = 8000;
// Delay between mutations (ms) — extra safety on top of throttle check
const MUTATION_DELAY_MS = 250;

// --- Helpers ---
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Shopify GraphQL call — returns data and manages throttle
async function gql(shopDomain, accessToken, query, variables = {}) {
  const endpoint = `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();

  // Cost-aware throttle
  const throttle = json.extensions?.cost?.throttleStatus;
  if (throttle) {
    const available = throttle.currentlyAvailable ?? 1000;
    const restoreRate = throttle.restoreRate ?? 50;
    if (available < THROTTLE_BUFFER) {
      const needed = THROTTLE_BUFFER - available;
      const waitMs = Math.min(
        Math.ceil((needed / restoreRate) * 1000) + 200,
        MAX_THROTTLE_SLEEP_MS
      );
      await sleep(waitMs);
    }
  }

  if (json.errors?.length) {
    throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 300)}`);
  }
  return json.data;
}

// --- Excel reader ---
function readExcel() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets["Shopify"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }).slice(1);

  const actualizar = []; // { handle, sku, quantity }
  const borradorSet = new Set();
  const borrarSet = new Set();
  const skipped = [];

  for (const row of rows) {
    const accion = String(row[0] || "").trim();
    const handle = String(row[1] || "").trim();
    const sku = String(row[9] || "").trim();
    const realAlegra = row[20];

    if (accion === "Actualizar") {
      if (!sku) {
        skipped.push({ accion, handle, sku, reason: "SKU vacío" });
        continue;
      }
      actualizar.push({ handle, sku, quantity: Number(realAlegra) || 0 });
    } else if (accion === "Pasar a Borrador") {
      if (handle) borradorSet.add(handle);
    } else if (accion === "Borrar") {
      if (handle) borrarSet.add(handle);
    } else if (accion === "??") {
      skipped.push({ accion, handle, sku, reason: "Accion desconocida (??)" });
    }
  }

  // Borrar wins over Borrador for overlap handles
  const borradorHandles = [...borradorSet].filter((h) => !borrarSet.has(h));
  const borrarHandles = [...borrarSet];

  return { actualizar, borradorHandles, borrarHandles, skipped };
}

// --- Shopify API helpers ---

async function getLocationId(shopDomain, accessToken) {
  const query = `{ locations(first: 50) { edges { node { id name } } } }`;
  const data = await gql(shopDomain, accessToken, query);
  const loc = data.locations.edges.find(
    (e) => e.node.name === LOCATION_NAME
  );
  if (!loc) {
    const names = data.locations.edges.map((e) => e.node.name).join(", ");
    throw new Error(
      `Ubicación "${LOCATION_NAME}" no encontrada. Disponibles: ${names}`
    );
  }
  return loc.node.id;
}

// Batch look up variants by SKU — up to 50 per query using aliases
async function batchGetVariantsBySku(shopDomain, accessToken, skus) {
  const results = {}; // sku -> { variantId, inventoryItemId }
  const BATCH = 50;

  for (let i = 0; i < skus.length; i += BATCH) {
    const chunk = skus.slice(i, i + BATCH);
    const aliases = chunk
      .map((sku, idx) => {
        const escaped = sku.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        return `v${idx}: productVariants(first: 2, query: "sku:\\"${escaped}\\"") {
          edges { node { id sku inventoryItem { id tracked } } }
        }`;
      })
      .join("\n");

    const query = `{ ${aliases} }`;
    const data = await gql(shopDomain, accessToken, query);

    for (let idx = 0; idx < chunk.length; idx++) {
      const sku = chunk[idx];
      const edges = data[`v${idx}`]?.edges || [];
      const node = edges[0]?.node || null;
      if (node) {
        results[sku] = {
          variantId: node.id,
          inventoryItemId: node.inventoryItem?.id || null,
          tracked: node.inventoryItem?.tracked ?? true,
        };
      } else {
        results[sku] = null;
      }
    }

    process.stdout.write(
      `  SKU lookup batch ${Math.ceil((i + BATCH) / BATCH)}/${Math.ceil(skus.length / BATCH)}\r`
    );
  }
  console.log();
  return results;
}

// Batch look up products by handle — up to 50 per query using aliases
async function batchGetProductsByHandle(shopDomain, accessToken, handles) {
  const results = {}; // handle -> { id, status, title } | null
  const BATCH = 50;

  for (let i = 0; i < handles.length; i += BATCH) {
    const chunk = handles.slice(i, i + BATCH);
    const aliases = chunk
      .map((handle, idx) => {
        const escaped = handle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        return `p${idx}: productByHandle(handle: "${escaped}") { id status title }`;
      })
      .join("\n");

    const query = `{ ${aliases} }`;
    const data = await gql(shopDomain, accessToken, query);

    for (let idx = 0; idx < chunk.length; idx++) {
      results[chunk[idx]] = data[`p${idx}`] || null;
    }

    process.stdout.write(
      `  Handle lookup batch ${Math.ceil((i + BATCH) / BATCH)}/${Math.ceil(handles.length / BATCH)}\r`
    );
  }
  console.log();
  return results;
}

// Set inventory on hand — max 250 per call, tracks per-SKU success/failure
// setQuantities: Array of { inventoryItemId, locationId, quantity, _sku, _handle }
async function batchSetInventory(shopDomain, accessToken, setQuantities) {
  const mutation = `
    mutation SetInventory($input: InventorySetOnHandQuantitiesInput!) {
      inventorySetOnHandQuantities(input: $input) {
        userErrors { field message }
        inventoryAdjustmentGroup { id }
      }
    }
  `;
  const BATCH = 250;
  const okSkus = [];
  const failedItems = []; // items from failed batches to retry one-by-one

  for (let i = 0; i < setQuantities.length; i += BATCH) {
    const chunk = setQuantities.slice(i, i + BATCH);
    const payload = chunk.map(({ inventoryItemId, locationId, quantity }) => ({
      inventoryItemId, locationId, quantity,
    }));
    const data = await gql(shopDomain, accessToken, mutation, {
      input: { reason: "correction", setQuantities: payload },
    });
    const userErrors = data.inventorySetOnHandQuantities?.userErrors || [];
    if (userErrors.length) {
      failedItems.push(...chunk);
    } else {
      okSkus.push(...chunk);
    }
    process.stdout.write(
      `  Inventory batch ${Math.ceil((i + BATCH) / BATCH)}/${Math.ceil(setQuantities.length / BATCH)}\r`
    );
    await sleep(MUTATION_DELAY_MS);
  }

  // Retry failed batches one-by-one for precision
  const retryFailed = [];
  if (failedItems.length > 0) {
    console.log(`\n  Reintentando ${failedItems.length} ítems fallidos (1 a 1)...`);
    for (let j = 0; j < failedItems.length; j++) {
      const item = failedItems[j];
      const payload = [{ inventoryItemId: item.inventoryItemId, locationId: item.locationId, quantity: item.quantity }];
      try {
        const data = await gql(shopDomain, accessToken, mutation, {
          input: { reason: "correction", setQuantities: payload },
        });
        const userErrors = data.inventorySetOnHandQuantities?.userErrors || [];
        if (userErrors.length) {
          retryFailed.push({ item, error: userErrors[0]?.message || "userError" });
        } else {
          okSkus.push(item);
        }
      } catch (err) {
        retryFailed.push({ item, error: err.message });
      }
      await sleep(MUTATION_DELAY_MS);
      if ((j + 1) % 50 === 0) process.stdout.write(`  Retry ${j + 1}/${failedItems.length}\r`);
    }
    console.log();
  }

  console.log();
  return { ok: okSkus.length, okSkus, retryFailed };
}

async function setProductStatus(shopDomain, accessToken, productId, status) {
  const mutation = `
    mutation UpdateStatus($input: ProductInput!) {
      productUpdate(input: $input) {
        userErrors { field message }
      }
    }
  `;
  const data = await gql(shopDomain, accessToken, mutation, {
    input: { id: productId, status },
  });
  const errors = data.productUpdate?.userErrors || [];
  if (errors.length) throw new Error(JSON.stringify(errors));
}

async function deleteProduct(shopDomain, accessToken, productId) {
  const mutation = `
    mutation DeleteProduct($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { field message }
      }
    }
  `;
  const data = await gql(shopDomain, accessToken, mutation, {
    input: { id: productId },
  });
  const errors = data.productDelete?.userErrors || [];
  if (errors.length) throw new Error(JSON.stringify(errors));
  return data.productDelete?.deletedProductId;
}

// --- Log ---
const logLines = []; // { status, accion, handle, sku, detalle }

function logEntry(status, accion, handle, sku, detalle) {
  logLines.push({ status, accion, handle, sku, detalle });
  // Only print non-OK or key milestones to stdout
  if (status !== "OK") {
    console.log(`  [${status}] ${accion} | ${handle || sku} | ${detalle}`);
  }
}

function writeLog() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logPath = path.resolve(
    __dirname,
    `../docuemntos/bulk-cleanup-log-${ts}.tsv`
  );
  const header = "STATUS\tACCION\tHANDLE\tSKU\tDETALLE";
  const body = logLines
    .map((l) => `${l.status}\t${l.accion}\t${l.handle}\t${l.sku}\t${l.detalle}`)
    .join("\n");
  fs.writeFileSync(logPath, [header, body].join("\n"), "utf-8");
  return logPath;
}

// --- Main ---
async function main() {
  const shopDomain = process.env.SHOPIFY_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopDomain || !accessToken) {
    console.error(
      "Faltan variables de entorno: SHOPIFY_DOMAIN y SHOPIFY_ADMIN_API_ACCESS_TOKEN"
    );
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log(
    APPLY
      ? "⚠️  MODO LIVE — los cambios SE APLICARÁN en Shopify"
      : "✓  MODO DRY-RUN — no se hará ningún cambio (revisar log)"
  );
  if (APPLY && RUN_BORRAR && !CONFIRM_DELETE) {
    console.error(
      "\nERROR: Para borrar productos en modo --apply también debes pasar --confirm-delete"
    );
    process.exit(1);
  }
  console.log(`   Fase: ${phaseArg}`);
  console.log(`   Tienda: ${shopDomain}`);
  console.log("=".repeat(60));

  // Parse Excel
  const { actualizar, borradorHandles, borrarHandles, skipped } = readExcel();

  // Log skipped rows from Excel parsing
  for (const s of skipped) {
    logEntry("SKIP", s.accion, s.handle, s.sku, s.reason);
  }

  console.log(`\nResumen del Excel:`);
  console.log(`  Actualizar (SKUs):         ${actualizar.length}`);
  console.log(`  Pasar a Borrador (prods):  ${borradorHandles.length}`);
  console.log(`  Borrar (prods únicos):     ${borrarHandles.length}`);
  console.log(`  Omitidas (Excel):          ${skipped.length}`);

  // Get location
  console.log(`\nBuscando ubicación "${LOCATION_NAME}"...`);
  const locationId = await gql(shopDomain, accessToken, "{ shop { name } }").then(() =>
    getLocationId(shopDomain, accessToken)
  );
  console.log(`  Location ID: ${locationId}`);

  // ============================================================
  // FASE 1: ACTUALIZAR INVENTARIO
  // ============================================================
  if (RUN_ACTUALIZAR) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`FASE 1: Actualizar inventario (${actualizar.length} SKUs)`);
    console.log(`${"─".repeat(50)}`);

    const skus = actualizar.map((r) => r.sku);
    console.log(`Buscando variantes en Shopify...`);
    const variantMap = await batchGetVariantsBySku(shopDomain, accessToken, skus);

    const setQuantities = [];
    let notFound = 0;
    let notTracked = 0;

    for (const { handle, sku, quantity } of actualizar) {
      const variant = variantMap[sku];
      if (!variant) {
        logEntry("SKIP", "Actualizar", handle, sku, "SKU no encontrado en Shopify");
        notFound++;
        continue;
      }
      if (!variant.inventoryItemId) {
        logEntry("SKIP", "Actualizar", handle, sku, "Sin inventoryItem");
        notFound++;
        continue;
      }
      if (!variant.tracked) {
        logEntry("SKIP", "Actualizar", handle, sku, "Inventario no rastreado (untracked)");
        notTracked++;
        continue;
      }
      // _sku and _handle are metadata only, not sent to API
      setQuantities.push({
        inventoryItemId: variant.inventoryItemId,
        locationId,
        quantity,
        _sku: sku,
        _handle: handle,
      });
    }

    console.log(`  Para actualizar: ${setQuantities.length}`);
    console.log(`  No encontrados: ${notFound}`);
    console.log(`  Sin tracking: ${notTracked}`);

    if (APPLY && setQuantities.length > 0) {
      console.log(`Enviando actualizaciones de inventario...`);
      const { ok, okSkus, retryFailed } = await batchSetInventory(
        shopDomain,
        accessToken,
        setQuantities
      );
      // Log per-SKU after batch completes
      for (const item of okSkus) {
        logEntry("OK", "Actualizar", item._handle, item._sku, `qty=${item.quantity}`);
      }
      for (const { item, error } of retryFailed) {
        logEntry("ERROR", "Actualizar", item._handle, item._sku, error.slice(0, 150));
      }
      console.log(`  ✓ Actualizados: ${ok}`);
      if (retryFailed.length) {
        console.error(`  ✗ Fallaron incluso en reintento: ${retryFailed.length} SKUs`);
      }
    } else if (!APPLY) {
      for (const item of setQuantities) {
        logEntry("OK", "Actualizar", item._handle, item._sku, `(dry) qty=${item.quantity}`);
      }
      console.log(`  (dry-run: se habrían enviado ${setQuantities.length} actualizaciones)`);
    }
  }

  // ============================================================
  // FASE 2: PASAR A BORRADOR
  // ============================================================
  if (RUN_BORRADOR) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`FASE 2: Pasar a Borrador (${borradorHandles.length} productos)`);
    console.log(`${"─".repeat(50)}`);

    console.log(`Buscando productos en Shopify...`);
    const productMap = await batchGetProductsByHandle(
      shopDomain,
      accessToken,
      borradorHandles
    );

    let ok = 0;
    let skip = 0;
    let errors = 0;

    for (let i = 0; i < borradorHandles.length; i++) {
      const handle = borradorHandles[i];
      const product = productMap[handle];

      if (!product) {
        logEntry("SKIP", "Borrador", handle, "", "Producto no encontrado en Shopify");
        skip++;
        continue;
      }
      if (product.status === "DRAFT") {
        logEntry("SKIP", "Borrador", handle, "", "Ya es DRAFT");
        skip++;
        continue;
      }

      if (APPLY) {
        try {
          await setProductStatus(shopDomain, accessToken, product.id, "DRAFT");
          await sleep(MUTATION_DELAY_MS);
          logEntry("OK", "Borrador", handle, "", `${product.status}→DRAFT`);
          ok++;
        } catch (err) {
          logEntry("ERROR", "Borrador", handle, "", err.message.slice(0, 200));
          errors++;
          await sleep(MUTATION_DELAY_MS);
        }
      } else {
        logEntry("OK", "Borrador", handle, "", `(dry) ${product.status}→DRAFT`);
        ok++;
      }

      if ((i + 1) % 50 === 0) {
        process.stdout.write(`  ${i + 1}/${borradorHandles.length} procesados\r`);
      }
    }
    console.log();
    console.log(`  ✓ OK: ${ok}  Skip: ${skip}  Errores: ${errors}`);
  }

  // ============================================================
  // FASE 3: BORRAR PRODUCTOS
  // ============================================================
  if (RUN_BORRAR) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`FASE 3: BORRAR productos (${borrarHandles.length} productos) ⚠️  IRREVERSIBLE`);
    console.log(`${"─".repeat(50)}`);

    if (APPLY && !CONFIRM_DELETE) {
      console.log(`  Saltada (requiere --confirm-delete en modo --apply)`);
    } else {
      console.log(`Buscando productos en Shopify...`);
      const productMap = await batchGetProductsByHandle(
        shopDomain,
        accessToken,
        borrarHandles
      );

      // Count how many actually exist
      const toDelete = borrarHandles.filter((h) => productMap[h] !== null);
      const notFound = borrarHandles.length - toDelete.length;

      console.log(`  Existen en Shopify: ${toDelete.length}`);
      console.log(`  No encontrados:     ${notFound}`);

      for (const handle of borrarHandles) {
        if (!productMap[handle]) {
          logEntry("SKIP", "Borrar", handle, "", "No existe en Shopify");
        }
      }

      if (!APPLY) {
        for (const handle of toDelete) {
          const p = productMap[handle];
          logEntry("OK", "Borrar", handle, "", `(dry) ELIMINAR "${p.title}" [${p.status}]`);
        }
        console.log(
          `  (dry-run: se habrían eliminado ${toDelete.length} productos)`
        );
      } else {
        let ok = 0;
        let errors = 0;

        for (let i = 0; i < toDelete.length; i++) {
          const handle = toDelete[i];
          const product = productMap[handle];
          try {
            await deleteProduct(shopDomain, accessToken, product.id);
            await sleep(MUTATION_DELAY_MS);
            logEntry("OK", "Borrar", handle, "", `ELIMINADO "${product.title}"`);
            ok++;
          } catch (err) {
            logEntry("ERROR", "Borrar", handle, "", err.message.slice(0, 200));
            errors++;
            await sleep(MUTATION_DELAY_MS);
          }

          if ((i + 1) % 100 === 0) {
            process.stdout.write(`  ${i + 1}/${toDelete.length} eliminados\r`);
          }
        }
        console.log();
        console.log(`  ✓ Eliminados: ${ok}  Errores: ${errors}`);
      }
    }
  }

  // --- Summary ---
  const counts = logLines.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    },
    {}
  );

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESUMEN FINAL`);
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  const logPath = writeLog();
  console.log(`\nLog guardado en: ${logPath}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\nError fatal:", err.message);
  process.exit(1);
});
