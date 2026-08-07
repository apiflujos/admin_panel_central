/**
 * Borra facturas de PRUEBA en Alegra — SOLO borradores (draft). Nunca toca una
 * factura emitida (open/closed/void): si no es draft, la salta y avisa.
 *
 * Los ids por defecto son los borradores creados durante las pruebas de
 * facturación (#1563 y #1573). Se pueden pasar otros con --ids=8606,8607,...
 *
 * Uso:
 *   node dist/src/scripts/delete-test-invoices.js                      # DRY-RUN (solo muestra)
 *   node dist/src/scripts/delete-test-invoices.js --apply              # borra los borradores
 *   node dist/src/scripts/delete-test-invoices.js --ids=8606,8607 --apply
 */
import "dotenv/config";
import { runWithOrg } from "../db";
import { resolveAlegraClientForStore } from "../services/alegra-product-import.service";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const idsArg = argv.find((a) => a.startsWith("--ids="))?.split("=")[1];
const DEFAULT_TEST_IDS = ["8606", "8607", "8608", "8613", "8614", "8615", "8616"];
const ids = (idsArg ? idsArg.split(",") : DEFAULT_TEST_IDS).map((s) => s.trim()).filter(Boolean);
const orgId = Number(process.env.APP_ORG_ID || 1);

type Inv = { id?: string | number; status?: string; numberTemplate?: { fullNumber?: string } };

async function main() {
  await runWithOrg(orgId, async () => {
    const alegra = await resolveAlegraClientForStore(1);
    console.log(`=== BORRADO DE FACTURAS DE PRUEBA (solo draft) ===`);
    console.log(`  ids: ${ids.join(", ")}`);
    console.log(APPLY ? "  modo: APPLY (borra)\n" : "  modo: DRY-RUN (no borra)\n");

    let deleted = 0;
    let skipped = 0;
    for (const id of ids) {
      let inv: Inv;
      try {
        inv = (await alegra.getInvoice(id)) as Inv;
      } catch (e) {
        console.log(`  #${id}: no existe / ya borrada (${e instanceof Error ? e.message.slice(0, 40) : e})`);
        continue;
      }
      const status = String(inv.status || "").toLowerCase();
      const num = inv.numberTemplate?.fullNumber || "-";
      if (status !== "draft") {
        console.log(`  #${id} (${num}): estado="${status}" NO es draft → SE SALTA (no se borra emitida)`);
        skipped += 1;
        continue;
      }
      if (!APPLY) {
        console.log(`  #${id} (${num}): draft → se borraría`);
        continue;
      }
      try {
        await alegra.deleteInvoice(id);
        console.log(`  #${id} (${num}): ✓ borrada`);
        deleted += 1;
      } catch (e) {
        console.log(`  #${id} (${num}): ✗ error al borrar: ${e instanceof Error ? e.message.slice(0, 60) : e}`);
      }
    }
    console.log(`\nResumen: ${APPLY ? `${deleted} borradas` : "dry-run"}, ${skipped} saltadas (no draft).`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
