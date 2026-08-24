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

/**
 * Un trabajo se reconoce por CONSULTAR SU INTERRUPTOR, no por estar en una
 * carpeta concreta.
 *
 * La primera versión de esta prueba recorría sólo `cron/` y `pollers/`, y por
 * eso daba el visto bueno mientras `retry-queue` y `webhook-dispatch` —dos de
 * los tres trabajos de la facturación— no registraban nada. Una prueba que
 * pasa en vacío es peor que no tenerla: da tranquilidad falsa.
 *
 * Con este criterio, un trabajo nuevo entra solo en la comprobación, esté
 * donde esté.
 */
function archivosDeTrabajos(): string[] {
  const rutas: string[] = [];
  const recorrer = (dir: string) => {
    let entradas: string[];
    try {
      entradas = readdirSync(dir, { withFileTypes: true }).map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
    } catch {
      return;
    }
    for (const entrada of entradas) {
      if (entrada.endsWith("/")) {
        recorrer(path.join(dir, entrada.slice(0, -1)));
        continue;
      }
      if (!entrada.endsWith(".ts") || entrada.endsWith(".test.ts")) continue;
      const ruta = path.join(dir, entrada);
      // Consultar el interruptor es lo que convierte a un archivo en trabajo.
      if (readFileSync(ruta, "utf8").includes("isWorkerEnabled(")) rutas.push(ruta);
    }
  };
  recorrer(RAIZ);
  return rutas;
}

/** Extrae el cuerpo de la pasada, emparejando llaves. */
function cuerpoDeLaPasada(fuente: string): string | null {
  const marcas = [/const pasada = async \(\) => \{/, /conRegistroDeSalud\("[^"]+", async \(\) => \{/];
  for (const marca of marcas) {
    const m = marca.exec(fuente);
    if (!m) continue;
    let profundidad = 1;
    let i = m.index + m[0].length;
    while (i < fuente.length && profundidad > 0) {
      if (fuente[i] === "{") profundidad += 1;
      else if (fuente[i] === "}") profundidad -= 1;
      i += 1;
    }
    return fuente.slice(m.index + m[0].length, i - 1);
  }
  return null;
}

/** Bloques `catch` que están en el nivel superior de la pasada, no anidados. */
function capturasDeNivelSuperior(cuerpo: string): string[] {
  const bloques: string[] = [];
  let profundidad = 0;
  for (let i = 0; i < cuerpo.length; i += 1) {
    if (cuerpo[i] === "{") profundidad += 1;
    else if (cuerpo[i] === "}") profundidad -= 1;
    else if (profundidad === 0 && cuerpo.startsWith("catch", i)) {
      const abre = cuerpo.indexOf("{", i);
      if (abre === -1) break;
      let d = 1;
      let j = abre + 1;
      while (j < cuerpo.length && d > 0) {
        if (cuerpo[j] === "{") d += 1;
        else if (cuerpo[j] === "}") d -= 1;
        j += 1;
      }
      bloques.push(cuerpo.slice(abre, j));
      i = j - 1;
      profundidad = 0;
    }
  }
  return bloques;
}

const ARCHIVOS = archivosDeTrabajos();

describe("salud de los trabajos automaticos", () => {
  it("encuentra TODOS los trabajos, no solo los de cron y pollers", () => {
    // Si el descubrimiento se rompe, las comprobaciones de abajo pasarían en
    // vacío, que es exactamente el problema que esta prueba viene a impedir.
    // Son 9: los 4 de cron, los 3 pollers, retry-queue y webhook-dispatch.
    expect(ARCHIVOS.length).toBe(9);
    const nombres = ARCHIVOS.map((r) => path.relative(RAIZ, r));
    // Estos dos vivían fuera de `cron/` y `pollers/` y se escapaban.
    expect(nombres).toContain(path.join("retry-queue", "index.ts"));
    expect(nombres).toContain(path.join("webhook-dispatch", "index.ts"));
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

  it("ningun trabajo se traga el error DE LA PASADA", () => {
    // Un `catch` por elemento dentro de un bucle es CORRECTO: una tienda mala
    // no debe matar el barrido entero. Lo que no vale es capturar el fallo de
    // la pasada completa, porque entonces el envoltorio registra "ok" mientras
    // el trabajo fracasa. Por eso sólo se mira el nivel superior de la pasada.
    const tragones = ARCHIVOS.filter((ruta) => {
      const cuerpo = cuerpoDeLaPasada(readFileSync(ruta, "utf8"));
      if (cuerpo === null) return false;
      const capturaMuda = capturasDeNivelSuperior(cuerpo).some((c) => !c.includes("throw"));
      // Hay dos formas válidas de propagar: relanzar dentro del `catch`, o
      // acumular los fallos y lanzarlos al final (lo que hace la retención,
      // que sigue podando las demás tablas antes de rendirse). La segunda no
      // lleva `throw` dentro del `catch`, y una comprobación ingenua la
      // marcaba como tragona.
      const propagaAlFinal = /\bthrow\b/.test(cuerpo);
      return capturaMuda && !propagaAlFinal;
    }).map((r) => path.relative(RAIZ, r));

    expect(
      tragones,
      `Estos trabajos capturan el error de la pasada ENTERA y siguen como si nada,\n` +
        `así que figuraría como correcta aunque hubiera fracasado:\n` +
        tragones.map((r) => `  ${r}`).join("\n")
    ).toEqual([]);
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
    expect(servicio).toContain("WHEN $2 = 'ok' THEN 0 ELSE worker_settings.fallos_seguidos + 1");
  });
});
