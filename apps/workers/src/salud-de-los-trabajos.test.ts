import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Ningún trabajo automático puede fallar en silencio.
 *
 * `log-retention` falló en TODAS sus pasadas durante un mes —unas 120 veces—
 * y nadie se enteró. El `catch` escribía un `console.error` y ahí acababa la
 * historia: el único testigo era un fichero de log que nadie lee y que la
 * propia retención rotaba. Nos quedamos ciegos mientras `sync_logs` crecía
 * hasta 188 MB.
 *
 * Estas pruebas exigen que cada trabajo registre cómo terminó su pasada. Un
 * trabajo nuevo que no lo haga rompe la suite.
 */

const RAIZ = path.resolve(__dirname);

function archivosDeTrabajos(): string[] {
  const rutas: string[] = [];
  for (const carpeta of ["cron", "pollers"]) {
    const dir = path.join(RAIZ, carpeta);
    let entradas: string[];
    try {
      entradas = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entrada of entradas) {
      if (!entrada.endsWith(".ts") || entrada.endsWith(".test.ts")) continue;
      rutas.push(path.join(dir, entrada));
    }
  }
  return rutas;
}

const ARCHIVOS = archivosDeTrabajos();

describe("salud de los trabajos automaticos", () => {
  it("encuentra los archivos de trabajos", () => {
    // Si el descubrimiento se rompe, las comprobaciones de abajo pasarían en
    // vacío, que es exactamente el problema que esta prueba viene a impedir.
    expect(ARCHIVOS.length).toBeGreaterThanOrEqual(6);
  });

  it("TODO trabajo registra como termino su pasada", () => {
    const sinRegistro = ARCHIVOS.filter((ruta) => !readFileSync(ruta, "utf8").includes("conRegistroDeSalud")).map((r) =>
      path.relative(RAIZ, r)
    );
    expect(
      sinRegistro,
      `Estos trabajos pueden fallar sin que nadie se entere.\n` +
        `Envuelve su pasada con conRegistroDeSalud("<clave>", pasada):\n` +
        sinRegistro.map((r) => `  ${r}`).join("\n")
    ).toEqual([]);
  });

  it("la retencion PROPAGA sus fallos en vez de tragarselos", () => {
    const fuente = readFileSync(path.join(RAIZ, "cron/log-retention.ts"), "utf8");
    // Antes cada tabla que fallaba dejaba un console.error y la pasada
    // terminaba "bien" aunque no hubiera podado una sola fila.
    expect(fuente).toContain("if (fallos.length) throw new Error(");
    expect(fuente).not.toContain("] falló:`, error instanceof Error");
  });

  it("registrar la salud NUNCA puede tumbar el trabajo", () => {
    const servicio = readFileSync(path.join(RAIZ, "../../../src/services/worker-settings.service.ts"), "utf8");
    const inicio = servicio.indexOf("export async function registrarEjecucionTrabajo");
    const captura = servicio.indexOf("} catch (e) {", inicio);
    expect(inicio).toBeGreaterThan(-1);
    expect(captura).toBeGreaterThan(inicio);
  });

  it("los fallos seguidos vuelven a cero cuando una pasada termina bien", () => {
    const servicio = readFileSync(path.join(RAIZ, "../../../src/services/worker-settings.service.ts"), "utf8");
    // Lo que importa es si está roto AHORA, no cuántas veces falló en su vida.
    expect(servicio).toContain("WHEN $2 = 'ok' THEN 0 ELSE fallos_seguidos + 1");
  });
});
