import "dotenv/config";
import path from "path";
import {
  findDefaultWorkbook,
  prepareInventoryWorkbook,
  writePreparedOutputs,
} from "../services/xlsx-inventory-preparation.service";

type CliArgs = {
  xlsxPath: string;
  sheet: string;
  warehouse: string;
  outDir: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    xlsxPath: "",
    sheet: process.env.XLSX_SHEET || "item",
    warehouse: process.env.XLSX_WAREHOUSE_NAME || "Bodega Pagina Web",
    outDir: "",
  };

  for (const arg of argv) {
    if (!arg.startsWith("--") && !args.xlsxPath) {
      args.xlsxPath = arg;
      continue;
    }
    if (arg.startsWith("--sheet=")) {
      args.sheet = arg.slice("--sheet=".length).trim() || args.sheet;
      continue;
    }
    if (arg.startsWith("--warehouse=")) {
      args.warehouse = arg.slice("--warehouse=".length).trim() || args.warehouse;
      continue;
    }
    if (arg.startsWith("--out-dir=")) {
      args.outDir = arg.slice("--out-dir=".length).trim();
    }
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
      "Uso: ts-node-dev src/scripts/prepare-shopify-inventory-from-xlsx.ts <archivo.xlsx> [--sheet=item] [--warehouse=Bodega Pagina Web] [--out-dir=./salida]"
    );
    console.error(
      "No se encontro un Excel por defecto con nombre 'Actualizacion Precios e Inventarios 29abr26*.xlsx'."
    );
    process.exit(1);
  }

  const filePath = path.resolve(args.xlsxPath);
  const { prepared, summary } = prepareInventoryWorkbook(filePath, {
    sheet: args.sheet,
    warehouse: args.warehouse,
  });
  const outputPaths = writePreparedOutputs(filePath, prepared, summary, args.outDir);

  console.log(JSON.stringify({ summary, outputPaths }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
