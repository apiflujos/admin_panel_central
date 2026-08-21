import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { WORKER_CATALOG, WORKER_KEYS, isWorkerKey } from "../../packages/shared/src/workers";

const WORKERS_DIR = path.resolve(__dirname, "../../apps/workers/src");

function readWorkerSources(dir: string): string {
  let out = "";
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out += readWorkerSources(full);
    else if (entry.name.endsWith(".ts")) out += fs.readFileSync(full, "utf8");
  }
  return out;
}

describe("catálogo de workers", () => {
  it("no tiene claves repetidas", () => {
    expect(new Set(WORKER_KEYS).size).toBe(WORKER_KEYS.length);
    expect(WORKER_CATALOG.map((w) => w.key).sort()).toEqual([...WORKER_KEYS].sort());
  });

  it("los que escriben en la tienda nacen APAGADOS", () => {
    // El incidente del 2026-08-20 (1.028 productos despublicados) empezó porque
    // un worker que escribe en Shopify corría sin que nadie lo hubiera encendido.
    const encendidosQueEscriben = WORKER_CATALOG.filter((w) => w.writesToStore && w.enabledByDefault);
    expect(encendidosQueEscriben.map((w) => w.key)).toEqual([]);
  });

  it("cada worker se describe en castellano llano para la vista de Super Admin", () => {
    for (const worker of WORKER_CATALOG) {
      expect(worker.label.trim().length, worker.key).toBeGreaterThan(0);
      expect(worker.description.trim().length, worker.key).toBeGreaterThan(20);
      expect(worker.impactIfOff.trim().length, worker.key).toBeGreaterThan(10);
    }
  });

  it("isWorkerKey rechaza lo que no está en el catálogo", () => {
    expect(isWorkerKey("products-sync")).toBe(true);
    expect(isWorkerKey("no-existe")).toBe(false);
    expect(isWorkerKey(42)).toBe(false);
    expect(isWorkerKey(null)).toBe(false);
  });
});

describe("todos los workers consultan su interruptor", () => {
  const fuentes = readWorkerSources(WORKERS_DIR);

  // Esta es la prueba que impide el olvido: un worker nuevo que no llame a
  // isWorkerEnabled correría siempre, apagado o no, y el interruptor de la UI
  // sería decorativo. Ya pasó con `createInShopify`.
  it.each([...WORKER_KEYS])('"%s" llama a isWorkerEnabled con su propia clave', (key) => {
    expect(fuentes).toContain(`isWorkerEnabled("${key}")`);
  });

  it("no hay llamadas a isWorkerEnabled con una clave desconocida", () => {
    const usadas = [...fuentes.matchAll(/isWorkerEnabled\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(usadas.length).toBeGreaterThan(0);
    for (const key of usadas) expect(isWorkerKey(key), key).toBe(true);
  });
});

describe("la migración deja los nueve sembrados y coherentes con el catálogo", () => {
  const SQL = fs.readFileSync(path.resolve(__dirname, "../db/migrations/019_worker_settings.sql"), "utf8");
  const sembrados = new Map<string, boolean>(
    [...SQL.matchAll(/\('([a-z-]+)',\s+(TRUE|FALSE)/g)].map((m) => [m[1], m[2] === "TRUE"])
  );

  it("siembra exactamente los del catálogo, ni uno más ni uno menos", () => {
    // Un worker sin fila es un worker cuyo estado no se puede comprobar con un
    // SELECT antes de arrancar.
    expect([...sembrados.keys()].sort()).toEqual([...WORKER_KEYS].sort());
  });

  it("el valor sembrado coincide con el del catálogo", () => {
    for (const worker of WORKER_CATALOG) {
      expect(sembrados.get(worker.key), worker.key).toBe(worker.enabledByDefault);
    }
  });

  it("los que modifican la tienda se siembran APAGADOS", () => {
    for (const worker of WORKER_CATALOG.filter((w) => w.writesToStore)) {
      expect(sembrados.get(worker.key), worker.key).toBe(false);
    }
  });

  it("no pisa decisiones ya tomadas", () => {
    expect(SQL).toContain("ON CONFLICT (worker_key) DO NOTHING");
  });
});
