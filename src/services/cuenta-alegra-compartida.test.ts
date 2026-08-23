import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Becam opera DOS tiendas facturando contra UNA sola cuenta de Alegra.
 *
 * Esa cuenta se comparte por `stores.alegra_account_id`. Hay un respaldo antiguo
 * —`alegra_accounts.store_id`— que ata una cuenta a UNA tienda, y varios sitios
 * lo usaban como si fuera la única forma: la segunda tienda salía "Sin
 * conectar" en pantalla aunque el motor la resolviera perfectamente.
 *
 * Se vigilan los TRES sitios que resuelven la cuenta, porque ya se arreglaron
 * de uno en uno y volvió a aparecer en el siguiente.
 */
const RAIZ = path.resolve(__dirname, "..", "..");
const leer = (p: string) => fs.readFileSync(path.join(RAIZ, p), "utf8");

const CONFIGS = leer("src/services/store-configs.service.ts");
const CONEXIONES = leer("src/services/store-connections.service.ts");
const IMPORT = leer("src/services/alegra-product-import.service.ts");

describe("una cuenta de Alegra puede servir a varias tiendas", () => {
  it("el motor la resuelve por stores.alegra_account_id", () => {
    // Es la referencia: los demás sitios deben coincidir con ésta.
    expect(IMPORT).toContain("s.alegra_account_id");
  });

  it("el listado de configuraciones la consulta", () => {
    expect(CONFIGS).toContain("COALESCE(st.alegra_account_id, c.alegra_account_id, aa.id)");
  });

  it("la configuración por tienda la consulta", () => {
    expect(CONFIGS).toContain("SELECT st.alegra_account_id FROM stores st");
  });

  it("el catálogo de conexiones la consulta: es lo que pinta 'Sin conectar'", () => {
    expect(CONEXIONES).toContain("SELECT id, name, created_at, alegra_account_id");
    expect(CONEXIONES).toContain("cuentasPorId");
  });

  it("el catálogo NO se queda sólo con el respaldo antiguo", () => {
    // Si alguien vuelve a armar el mapa únicamente con account.storeId, la
    // segunda tienda desaparece otra vez.
    const ini = CONEXIONES.indexOf("const alegraByStore");
    const cuerpo = CONEXIONES.slice(ini, ini + 1200);
    expect(cuerpo).toContain("store.alegra_account_id");
  });
});
