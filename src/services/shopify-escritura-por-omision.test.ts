import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guardia contra la regresión que despublicó el catálogo dos veces el
 * 2026-08-20.
 *
 * El kill switch vive en `sync-context.ts` y comprueba `=== true`, pero el
 * valor llega YA NORMALIZADO desde `store-configs.service.ts`. Mientras el
 * valor por defecto de ese normalizado fuese `true`, la comprobación recibía
 * siempre `true` y no bloqueaba nada: se despublicaron 1.028 productos, y otros
 * 836 en un segundo episodio, creyendo que el kill switch estaba puesto.
 *
 * Se comprueba sobre el texto del módulo, sin montar base de datos: lo que hay
 * que fijar es el VALOR POR DEFECTO, y así el test falla en cuanto alguien lo
 * cambie de vuelta.
 */
const ruta = path.join(__dirname, "store-configs.service.ts");
const fuente = fs.readFileSync(ruta, "utf8");

describe("escrituras a Shopify: apagadas por omisión", () => {
  it("la constante del valor por defecto es false", () => {
    expect(fuente).toMatch(/const ESCRITURA_SHOPIFY_POR_OMISION\s*=\s*false/);
  });

  // Sólo los que se alimentan de `rules`: hay otro `createInShopify` para la
  // sincronización de CONTACTOS que no tiene nada que ver con escribir productos.
  const usosDeRules = (campo: string) =>
    fuente.match(new RegExp(campo + ":\\s*normalizeBoolean\\(\\(rules as Record<string, unknown>\\)[\\s\\S]*?\\),", "g")) || [];

  it("updateInShopify NUNCA usa true como valor por defecto", () => {
    const usos = usosDeRules("updateInShopify");
    expect(usos.length).toBeGreaterThan(0);
    for (const uso of usos) {
      expect(uso).toContain("ESCRITURA_SHOPIFY_POR_OMISION");
      expect(uso).not.toMatch(/,\s*true\s*\),/);
    }
  });

  it("createInShopify (productos) NUNCA usa true como valor por defecto", () => {
    const usos = usosDeRules("createInShopify");
    expect(usos.length).toBeGreaterThan(0);
    for (const uso of usos) {
      expect(uso).toContain("ESCRITURA_SHOPIFY_POR_OMISION");
      expect(uso).not.toMatch(/,\s*true\s*\),/);
    }
  });

  it("sync-context exige true explícito en AMBOS permisos, no sólo en update", () => {
    const ctx = fs.readFileSync(path.join(__dirname, "sync-context.ts"), "utf8");
    expect(ctx).toMatch(/updateInShopify:\s*\(rules as InventoryRules\)\.updateInShopify === true/);
    expect(ctx).toMatch(/createInShopify:\s*\(rules as InventoryRules\)\.createInShopify === true/);
    expect(ctx).not.toMatch(/(update|create)InShopify:\s*\(rules as InventoryRules\)\.(update|create)InShopify !== false/);
  });

  /**
   * El fallo no estuvo en una capa, sino en que había VARIAS resolviendo el
   * mismo permiso y sólo se corrigió una. Este barrido recorre todo el código
   * de producto y falla si alguna vuelve a habilitar por omisión.
   */
  it("NINGUNA capa del repo habilita la escritura de productos con '!== false'", () => {
    const raiz = path.resolve(__dirname, "..", "..");
    const permisivos: string[] = [];
    const saltar = new Set(["node_modules", "dist", ".git", ".next", ".restore"]);

    const recorrer = (dir: string) => {
      for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
        if (saltar.has(entrada.name)) continue;
        const completo = path.join(dir, entrada.name);
        if (entrada.isDirectory()) { recorrer(completo); continue; }
        if (!/\.(ts|tsx)$/.test(entrada.name) || entrada.name.includes(".test.")) continue;
        // Los permisos de la sincronización de CONTACTOS son otro dominio: crean
        // fichas de cliente, no publican ni despublican productos.
        if (/contact/i.test(entrada.name)) continue;
        const texto = fs.readFileSync(completo, "utf8");
        for (const linea of texto.split("\n")) {
          // Los permisos de CONTACTOS son otra cosa y no despublican nada.
          if (/contact/i.test(linea)) continue;
          if (/(createInShopify|updateInShopify)\s*!==\s*false/.test(linea)) {
            permisivos.push(`${path.relative(raiz, completo)}: ${linea.trim().slice(0, 90)}`);
          }
        }
      }
    };
    recorrer(path.join(raiz, "src"));
    recorrer(path.join(raiz, "apps"));

    expect(permisivos, `Capas que habilitan escritura por omisión:\n${permisivos.join("\n")}`).toEqual([]);
  });
});
