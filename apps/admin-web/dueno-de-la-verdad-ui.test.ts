import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * La elección de quién manda tiene que sobrevivir CUATRO capas. Dos de ellas
 * son listas blancas que descartan en silencio lo que no se nombre:
 *
 *   panel  ->  saveStoreConfig (cliente)  ->  Express  ->  configJson (lista blanca)
 *   base   ->  storeConfigs DTO (lista blanca)  ->  panel
 *
 * Ya pasó una vez: `configJson` no nombraba `sourceOfTruth` y la elección no
 * llegaba nunca a guardarse.
 */
const RAIZ = path.resolve(__dirname, "..", "..");
const leer = (p: string) => fs.readFileSync(path.join(RAIZ, p), "utf8");

const PANEL = leer("apps/admin-web/components/store-source-of-truth-panel.tsx");
const PAGINA = leer("apps/admin-web/components/settings-stores-page.tsx");
const CLIENTE = leer("apps/admin-web/lib/api.ts");
const DTO = leer("apps/admin-web/lib/server-api.ts");
const TIPO = leer("apps/admin-web/lib/connections-workspace.ts");

describe("la elección llega desde la pantalla hasta la base", () => {
  it("el panel está montado en la pantalla de tiendas", () => {
    expect(PAGINA).toContain("<StoreSourceOfTruthPanel");
    expect(PAGINA).toContain('from "./store-source-of-truth-panel"');
  });

  it("el panel guarda enviando sourceOfTruth", () => {
    expect(PANEL).toContain("saveStoreConfig(");
    expect(PANEL).toContain("{ sourceOfTruth: actual");
  });

  it("el cliente admite enviar SÓLO ese bloque", () => {
    // Si el payload fuera obligatorio y completo, este panel tendría que
    // arrastrar toda la configuración de la tienda y podría pisar lo ajeno.
    expect(CLIENTE).toContain('sourceOfTruth?: CriticalStoreConfig["sourceOfTruth"]');
    expect(CLIENTE).toContain("Partial<Pick<CriticalStoreConfig");
  });

  it("el DTO que alimenta la interfaz lo incluye", () => {
    expect(DTO).toContain("sourceOfTruth: normalizeSourceOfTruth(");
  });

  it("el tipo del workspace lo declara", () => {
    expect(TIPO).toContain("sourceOfTruth?: SourceOfTruth;");
  });
});

describe("el panel protege de lo peligroso", () => {
  it("pide confirmación SOLO al quitarle el inventario a Alegra", () => {
    // Es el cambio que desactiva la barrera contra la sobreventa. Volver a
    // ponérselo a Alegra no necesita confirmación.
    expect(PANEL).toMatch(/actual\.inventory === "shopify" && guardado\?\.inventory === "alegra"/);
    expect(PANEL).toContain("window.confirm");
  });

  it("avisa mientras la tienda mande sobre las existencias", () => {
    expect(PANEL).toContain("worker-warning");
    expect(PANEL).toContain("vender lo que Alegra no tenga");
  });

  it("deja claro que los requisitos de facturación NO se eligen aquí", () => {
    expect(PANEL).toContain("DIAN");
    expect(PANEL).toContain("no facturable");
  });

  it("normaliza lo que lee: una tienda sin el dato no rompe la pantalla", () => {
    expect(PANEL).toContain("normalizeSourceOfTruth(t.sourceOfTruth)");
  });
});
