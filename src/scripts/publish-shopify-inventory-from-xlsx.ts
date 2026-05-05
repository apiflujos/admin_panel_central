import "dotenv/config";
import fs from "fs";
import path from "path";

import { findDefaultWorkbook, prepareInventoryWorkbook, writePreparedOutputs } from "../services/xlsx-inventory-preparation.service";
import {
  applyInventoryUpdates,
  applyPriceUpdates,
  buildPublicationReport,
  filterPreparedRowsForPublication,
  loadShopifyPublicationConfig,
  prepareShopifyPublicationPlan,
  ShopifyApiClient,
  writePublicationArtifacts,
} from "../services/shopify-inventory-publication.service";

type CliArgs = {
  xlsxPath: string;
  sheet: string;
  warehouse: string;
  outDir: string;
  references: string[];
  shopDomain: string;
  apiVersion: string;
  locationId: string;
  apply: boolean;
  includeHidden: boolean;
  limit: number;
  batchSize: number;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    xlsxPath: "",
    sheet: process.env.XLSX_SHEET || "item",
    warehouse: process.env.XLSX_WAREHOUSE_NAME || "Bodega Pagina Web",
    outDir: "",
    references: [],
    shopDomain: process.env.SHOP_DOMAIN || process.env.SHOPIFY_DOMAIN || "",
    apiVersion: process.env.SHOPIFY_API_VERSION || "",
    locationId: "",
    apply: false,
    includeHidden: false,
    limit: 0,
    batchSize: 50,
  };

  for (const arg of argv) {
    if (!arg.startsWith("--") && !args.xlsxPath) {
      args.xlsxPath = arg;
      continue;
    }
    if (arg.startsWith("--sheet=")) args.sheet = arg.slice("--sheet=".length).trim() || args.sheet;
    else if (arg.startsWith("--warehouse=")) args.warehouse = arg.slice("--warehouse=".length).trim() || args.warehouse;
    else if (arg.startsWith("--out-dir=")) args.outDir = arg.slice("--out-dir=".length).trim();
    else if (arg.startsWith("--reference=")) {
      args.references.push(
        ...arg
          .slice("--reference=".length)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      );
    } else if (arg.startsWith("--shop-domain=")) args.shopDomain = arg.slice("--shop-domain=".length).trim();
    else if (arg.startsWith("--api-version=")) args.apiVersion = arg.slice("--api-version=".length).trim();
    else if (arg.startsWith("--location-id=")) args.locationId = arg.slice("--location-id=".length).trim();
    else if (arg.startsWith("--limit=")) args.limit = Math.max(0, Number(arg.slice("--limit=".length)) || 0);
    else if (arg.startsWith("--batch-size=")) args.batchSize = Math.max(1, Number(arg.slice("--batch-size=".length)) || 50);
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--include-hidden") args.includeHidden = true;
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.xlsxPath) {
    args.xlsxPath = findDefaultWorkbook();
  }
  if (!args.xlsxPath) {
    console.error(
      "Uso: ts-node-dev src/scripts/publish-shopify-inventory-from-xlsx.ts <archivo.xlsx> [--warehouse=Bodega Pagina Web] [--shop-domain=tienda.myshopify.com] [--apply]"
    );
    console.error("No se encontro un Excel por defecto con nombre 'Actualizacion Precios e Inventarios 29abr26*.xlsx'.");
    process.exit(1);
  }

  const xlsxPath = path.resolve(args.xlsxPath);
  if (!fs.existsSync(xlsxPath)) {
    console.error(`No existe el archivo: ${xlsxPath}`);
    process.exit(1);
  }

  const { prepared, summary } = prepareInventoryWorkbook(xlsxPath, {
    sheet: args.sheet,
    warehouse: args.warehouse,
  });
  if (process.env.PUBLISH_SKIP_PREPARED_OUTPUTS !== "1") {
    writePreparedOutputs(xlsxPath, prepared, summary, args.outDir);
  }

  const rows = filterPreparedRowsForPublication(prepared, {
    references: args.references,
    includeHidden: args.includeHidden,
    limit: args.limit,
  });

  const shopifyConfig = await loadShopifyPublicationConfig(args);
  try {
    const shopify = new ShopifyApiClient(shopifyConfig);
    const locationId = shopifyConfig.locationId || (await shopify.getPrimaryLocationId());
    if (!locationId) {
      throw new Error("No se pudo resolver locationId de Shopify.");
    }

    const plan = await prepareShopifyPublicationPlan({ rows, shopify });
    const report = buildPublicationReport({
      mode: args.apply ? "apply" : "dry_run",
      sourceFile: xlsxPath,
      shopDomain: shopifyConfig.shopDomain,
      configSource: shopifyConfig.source,
      locationId,
      selectedWarehouse: summary.selectedWarehouse,
      summary,
      plan,
    });

    if (args.apply && plan.inventoryUpdatesNeeded > 0) {
      const inventoryApply = await applyInventoryUpdates(
        shopify,
        locationId,
        plan.matched.filter(
          (item: (typeof plan.matched)[number]) => Number(item.previousInventoryQuantity) !== Number(item.selectedQuantity)
        ),
        args.batchSize
      );
      report.appliedBatches = inventoryApply.batchResults.length;
      report.appliedRows = inventoryApply.appliedRows;
      report.batchResults = inventoryApply.batchResults;
    }

    if (args.apply && plan.priceUpdatesNeeded > 0) {
      const priceApply = await applyPriceUpdates(
        shopify,
        plan.matched.filter(
          (item: (typeof plan.matched)[number]) =>
            item.desiredPrice !== null &&
            (item.previousPrice !== item.desiredPrice ||
              (item.previousCompareAtPrice || null) !== (item.desiredCompareAtPrice || null))
        )
      );
      report.appliedPriceBatches = priceApply.priceBatchResults.length;
      report.appliedPriceRows = priceApply.appliedPriceRows;
      report.priceBatchResults = priceApply.priceBatchResults;
    }

    const artifacts = writePublicationArtifacts({
      xlsxPath,
      outDir: args.outDir,
      report,
      unmatched: plan.unmatched,
    });
    console.log(JSON.stringify({ ...artifacts, report }, null, 2));
  } finally {
    await shopifyConfig.cleanup();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/ECONNREFUSED/.test(message) && /127\.0\.0\.1:5441/.test(message)) {
    console.error(`${message}. Tu Postgres local no esta aceptando conexiones en 127.0.0.1:5441.`);
    console.error(
      "Levanta la BD o define SHOPIFY_DOMAIN, SHOPIFY_ACCESS_TOKEN y opcionalmente SHOPIFY_LOCATION_ID en .env para ejecutar el publicador sin depender de la BD."
    );
  } else {
    console.error(message);
  }
  process.exit(1);
});
