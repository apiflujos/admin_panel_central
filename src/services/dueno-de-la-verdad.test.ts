import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { DEFAULT_SOURCE_OF_TRUTH, normalizeSourceOfTruth } from "../../packages/shared/src/source-of-truth";

const SYNC = fs.readFileSync(path.join(__dirname, "alegra-to-shopify.service.ts"), "utf8");
const FACTURA = fs.readFileSync(path.join(__dirname, "shopify-to-alegra.service.ts"), "utf8");
const CONTEXTO = fs.readFileSync(path.join(__dirname, "sync-context.ts"), "utf8");
const CONFIG = fs.readFileSync(path.join(__dirname, "store-configs.service.ts"), "utf8");

/**
 * Quién manda sobre cada área se elige por tienda. La elección debe llegar
 * hasta donde se escribe, y sólo puede RESTRINGIR: nunca puede conceder una
 * escritura que los permisos explícitos no hayan dado.
 */
describe("el dueño de la verdad llega hasta donde se escribe", () => {
  it("se persiste en la configuración de la tienda", () => {
    expect(CONFIG).toContain("sourceOfTruth: normalizeSourceOfTruth(");
  });

  it("viaja en el contexto de sincronización", () => {
    expect(CONTEXTO).toContain("sourceOfTruth: SourceOfTruth;");
    expect(CONTEXTO).toContain("sourceOfTruth: normalizeSourceOfTruth(");
  });

  it("gobierna existencias, precios, publicación y catálogo", () => {
    expect(SYNC).toContain('alegraMandaEn(ctx.sourceOfTruth, "inventory")');
    expect(SYNC).toContain('alegraMandaEn(ctx.sourceOfTruth, "prices")');
    expect(SYNC).toContain('alegraMandaEn(ctx.sourceOfTruth, "publication")');
    expect(SYNC).toContain('alegraMandaEn(ctx.sourceOfTruth, "catalog")');
  });

  it("sólo RESTRINGE: los frenos de worker y permiso siguen delante", () => {
    // El orden importa. Si el dueño de la verdad se comprobara ANTES que el
    // interruptor del worker, elegir "Alegra manda" reactivaría escrituras que
    // el interruptor tenía apagadas.
    const posWorker = SYNC.indexOf('isWorkerEnabled("products-sync")');
    const posDueno = SYNC.indexOf('alegraMandaEn(ctx.sourceOfTruth, "prices")');
    expect(posWorker).toBeGreaterThan(-1);
    expect(posDueno).toBeGreaterThan(posWorker);
  });

  it("por omisión manda Alegra: la tienda no puede vender lo que no existe", () => {
    expect(normalizeSourceOfTruth(undefined)).toEqual(DEFAULT_SOURCE_OF_TRUTH);
    expect(DEFAULT_SOURCE_OF_TRUTH.inventory).toBe("alegra");
  });
});

/**
 * Los requisitos de facturación NO son configurables: los pone la DIAN.
 */
describe("un pedido que no se puede facturar no se intenta", () => {
  it("el prever corre ANTES de tocar Alegra", () => {
    const posPreflight = FACTURA.indexOf("preflightDeFacturacion(");
    const posContacto = FACTURA.indexOf("ctx.alegra.updateContact(");
    expect(posPreflight).toBeGreaterThan(-1);
    expect(posContacto).toBeGreaterThan(posPreflight);
  });

  it("el pedido se marca como no facturable, con el motivo", () => {
    expect(FACTURA).toContain("sync_status = 'no_facturable'");
    expect(FACTURA).toContain("sync_block_reason");
    expect(FACTURA).toContain("bloqueos: veredicto.bloqueos");
  });

  it("el worker NO se lanza sobre un pedido ya descartado", () => {
    expect(FACTURA).toContain("pedidoYaDescartado(");
    expect(FACTURA).toMatch(/if \(!options\?\.forceSync && \(await pedidoYaDescartado/);
  });

  it("el reintento MANUAL sí lo vuelve a intentar", () => {
    const ops = fs.readFileSync(path.join(__dirname, "operations.service.ts"), "utf8");
    expect(ops).toContain("reactivarPedidoDescartado(");
    expect(ops).toContain("forceSync: true");
  });

  it("el motivo se guarda estructurado para poder mostrarlo", () => {
    expect(FACTURA).toContain("resumirBloqueos(veredicto)");
    expect(FACTURA).toMatch(/response: \{ bloqueos: veredicto\.bloqueos/);
  });

  it("la migración crea la columna del motivo", () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, "../db/migrations/021_orders_motivo_no_facturable.sql"),
      "utf8"
    );
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS sync_block_reason");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS");
  });
});

describe("la elección se puede guardar", () => {
  const GUARDADO = fs.readFileSync(path.join(__dirname, "store-configs.service.ts"), "utf8");

  it("saveStoreConfig acepta y persiste sourceOfTruth", () => {
    // `configJson` es una LISTA BLANCA: lo que no se nombre aquí se descarta
    // en silencio y la elección del cliente no se guarda nunca.
    expect(GUARDADO).toContain("payload.sourceOfTruth");
    expect(GUARDADO).toMatch(/const configJson = \{[^}]*sourceOfTruth,/s);
  });

  it("se normaliza al guardar: un valor inválido no llega a la base", () => {
    expect(GUARDADO).toContain("normalizeSourceOfTruth({ ...existingSourceOfTruth");
  });

  it("lo que no venga en el payload conserva lo que ya había", () => {
    expect(GUARDADO).toContain("...existingSourceOfTruth");
  });
});

describe("la elección llega a las DOS funciones que arman la configuración", () => {
  /**
   * `store-configs.service` tiene DOS constructores de esta forma:
   *   - el del LISTADO, que alimenta la pantalla de Super Admin;
   *   - `getStoreConfigForStoreId`, que alimenta a `buildSyncContext` — o sea,
   *     al sincronizador.
   *
   * `sourceOfTruth` estaba sólo en el primero: la elección se guardaba, se veía
   * en pantalla y el sincronizador NUNCA la aplicaba. Además el primero leía de
   * los ajustes GLOBALES en vez del config_json de la tienda.
   */
  it("aparece en las dos, no en una", () => {
    const apariciones = CONFIG.match(/sourceOfTruth: normalizeSourceOfTruth\(/g) || [];
    expect(apariciones.length).toBeGreaterThanOrEqual(2);
  });

  it("las dos leen del config_json de LA TIENDA, no de los ajustes globales", () => {
    const lecturas = CONFIG.match(/sourceOfTruth: normalizeSourceOfTruth\(\(([a-zA-Z]+) as/g) || [];
    expect(lecturas.length).toBeGreaterThanOrEqual(2);
    for (const l of lecturas) expect(l, l).toContain("(config as");
  });

  it("getStoreConfigForStoreId la devuelve: es la que ve el sincronizador", () => {
    const ini = CONFIG.indexOf("async function getStoreConfigForStoreId(");
    const fin = CONFIG.indexOf("\nexport async function getStoreConfigForDomain");
    const cuerpo = CONFIG.slice(ini, fin > ini ? fin : undefined);
    expect(cuerpo).toContain("sourceOfTruth: normalizeSourceOfTruth(");
  });
});

describe("la cuenta de Alegra se resuelve igual en la pantalla y en el motor", () => {
  /**
   * Becam tiene DOS tiendas sobre UNA sola cuenta de Alegra. El motor la
   * resuelve por `stores.alegra_account_id` (ver resolveAlegraClientForStore),
   * que admite compartirla; las consultas que alimentan la pantalla NO la
   * miraban, así que la segunda tienda aparecía como "Sin cuenta asociada"
   * aunque facturara contra la misma cuenta.
   */
  it("el listado consulta primero stores.alegra_account_id", () => {
    expect(CONFIG).toContain("COALESCE(st.alegra_account_id, c.alegra_account_id, aa.id)");
  });

  it("la config por tienda también la consulta", () => {
    const ini = CONFIG.indexOf("async function getStoreConfigForStoreId(");
    const fin = CONFIG.indexOf("\nexport async function getStoreConfigForDomain");
    const cuerpo = CONFIG.slice(ini, fin > ini ? fin : undefined);
    expect(cuerpo).toContain("SELECT st.alegra_account_id FROM stores st");
  });

  it("respeta el ORDEN de prioridad del motor: stores primero", () => {
    // Si se invirtiera, una tienda con config antigua ignoraría la cuenta
    // compartida y apuntaría a otra.
    const m = CONFIG.match(/COALESCE\(st\.alegra_account_id, c\.alegra_account_id, aa\.id\)/);
    expect(m, "el orden debe ser stores -> config -> respaldo antiguo").toBeTruthy();
  });
});
