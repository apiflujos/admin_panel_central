/**
 * Arregla el SWAP de EAN entre 2 ítems de Alegra (#1773 y #1774), cuyas
 * referencias quedaron intercambiadas. Swap en 3 pasos (valor temporal) para
 * evitar el conflicto "referencia ya asignada a otro ítem".
 *
 * Estándar correcto (copia pre-daño):
 *   1773 (AM Protector Solar Acqua Serum)  -> 7702678077942
 *   1774 (Protector Sol Acqua Serum Mini)  -> 7702678485402
 *
 * Solo toca la `reference` de esos 2 ítems. Nada más. Verifica antes y después.
 *
 * Uso:  node dist/src/scripts/fix-ean-swap.js            # DRY-RUN (solo muestra)
 *       node dist/src/scripts/fix-ean-swap.js --apply    # aplica el swap
 */
import "dotenv/config";
import { runWithOrg } from "../db";
import { resolveAlegraClientForStore } from "../services/alegra-product-import.service";

const APPLY = process.argv.slice(2).includes("--apply");
const orgId = Number(process.env.APP_ORG_ID || 1);

type Item = { id?: string | number; name?: string; reference?: string };

async function main() {
  await runWithOrg(orgId, async () => {
    const alegra = await resolveAlegraClientForStore(1);
    const show = async (id: string, label: string) => {
      const it = (await alegra.getItem(id)) as Item;
      console.log(`  ${label} #${id} | ${String(it.name || "").slice(0, 34)} | ref=${it.reference}`);
      return it;
    };

    console.log("=== ANTES ===");
    await show("1773", "");
    await show("1774", "");
    console.log("");

    if (!APPLY) {
      console.log("DRY-RUN. Con --apply hará el swap:");
      console.log("  1774 -> TMP  |  1773 -> 7702678077942  |  1774 -> 7702678485402");
      return;
    }

    console.log("Aplicando swap (3 pasos)...");
    await alegra.updateItem("1774", { reference: "TMP-SWAP-1774" });
    console.log("  paso 1 OK: 1774 -> TMP (libera 7702678077942)");
    await alegra.updateItem("1773", { reference: "7702678077942" });
    console.log("  paso 2 OK: 1773 -> 7702678077942");
    await alegra.updateItem("1774", { reference: "7702678485402" });
    console.log("  paso 3 OK: 1774 -> 7702678485402");
    console.log("");

    console.log("=== DESPUES (verificación) ===");
    const a = await show("1773", "");
    const b = await show("1774", "");
    const ok = a.reference === "7702678077942" && b.reference === "7702678485402";
    console.log("");
    console.log(ok ? "✓ SWAP CORRECTO — ambos con su EAN." : "✗ REVISAR — no quedaron como se esperaba.");
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
