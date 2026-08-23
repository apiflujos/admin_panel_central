import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Ninguna carpeta de código puede quedar fuera de la red.
 *
 * POR QUÉ EXISTE
 * --------------
 * Esto ha pasado TRES veces, y cada vez se descubrió por casualidad:
 *
 *   · `packages/**` estaba fuera de las pruebas: 10 archivos con 49 pruebas
 *     no se ejecutaban NUNCA, incluida la lógica de inventario y precios.
 *   · `apps/admin-web/**\/*.test.ts` estaba fuera: las pruebas de estructura
 *     de rutas tampoco corrían.
 *   · `apps/workers/**` estaba fuera: es donde viven los pollers y la
 *     retención, el código que corre solo y sin nadie mirando. Se descubrió
 *     al escribir una prueba y ver que vitest no la encontraba.
 *
 * El patrón no se arregla arreglando el caso: se arregla haciendo que sea
 * IMPOSIBLE. Esta prueba recorre el árbol, encuentra cada área con código y
 * exige que esté cubierta por las tres redes. Añadir un área nueva rompe la
 * suite hasta que se conecte.
 */

const RAIZ = path.resolve(__dirname, "..");
const IGNORAR = new Set(["node_modules", "dist", ".next", ".git", "coverage", "public"]);

/** Áreas de código: `src`, y cada subcarpeta de `packages/` y `apps/`. */
function descubrirAreas(): string[] {
  const areas: string[] = [];
  const tieneFuentes = (dir: string): boolean => {
    let entradas: string[];
    try {
      entradas = readdirSync(path.join(RAIZ, dir));
    } catch {
      return false;
    }
    for (const entrada of entradas) {
      if (IGNORAR.has(entrada)) continue;
      const rel = path.join(dir, entrada);
      const abs = path.join(RAIZ, rel);
      let esDir: boolean;
      try {
        esDir = statSync(abs).isDirectory();
      } catch {
        continue;
      }
      if (esDir) {
        if (tieneFuentes(rel)) return true;
      } else if (/\.(ts|tsx)$/.test(entrada) && !/\.d\.ts$/.test(entrada)) {
        return true;
      }
    }
    return false;
  };

  if (tieneFuentes("src")) areas.push("src");
  for (const contenedor of ["packages", "apps"]) {
    let hijos: string[];
    try {
      hijos = readdirSync(path.join(RAIZ, contenedor));
    } catch {
      continue;
    }
    for (const hijo of hijos) {
      if (IGNORAR.has(hijo)) continue;
      const rel = `${contenedor}/${hijo}`;
      try {
        if (!statSync(path.join(RAIZ, rel)).isDirectory()) continue;
      } catch {
        continue;
      }
      if (tieneFuentes(rel)) areas.push(rel);
    }
  }
  return areas;
}

const leer = (rel: string) => readFileSync(path.join(RAIZ, rel), "utf8");

/**
 * Los tsconfig llevan comentarios, pero quitarlos con una expresión regular
 * ingenua DESTROZA los patrones: `"src/**\/*.ts"` contiene `/**\/`, que parece
 * un comentario de bloque. Por eso se recorre carácter a carácter saltando el
 * interior de las cadenas.
 */
function quitarComentarios(texto: string): string {
  let salida = "";
  let enCadena = false;
  let escapado = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (enCadena) {
      salida += c;
      if (escapado) escapado = false;
      else if (c === "\\") escapado = true;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') {
      enCadena = true;
      salida += c;
      continue;
    }
    if (c === "/" && texto[i + 1] === "/") {
      while (i < texto.length && texto[i] !== "\n") i += 1;
      salida += "\n";
      continue;
    }
    if (c === "/" && texto[i + 1] === "*") {
      i += 2;
      while (i < texto.length && !(texto[i] === "*" && texto[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }
    salida += c;
  }
  return salida;
}

function leerJsonConComentarios(rel: string): Record<string, unknown> {
  return JSON.parse(quitarComentarios(leer(rel))) as Record<string, unknown>;
}

/**
 * Convierte un patrón glob en expresión regular.
 *
 * Se usan MARCADORES intermedios porque sustituir `*` al final pisaba el `*`
 * cuantificador de la expresión que se acababa de construir: `(?:[^/]+/)*` se
 * convertía en `(?:[^/]+/)[^/]*` y la comprobación daba resultados falsos en
 * ambos sentidos.
 */
function globARegex(patron: string): RegExp {
  const DOBLE_BARRA = "\u0000A";
  const DOBLE = "\u0000B";
  const SIMPLE = "\u0000C";
  const cuerpo = patron
    .replace(/\*\*\//g, DOBLE_BARRA)
    .replace(/\*\*/g, DOBLE)
    .replace(/\*/g, SIMPLE)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .split(DOBLE_BARRA)
    .join("(?:[^/]+/)*")
    .split(DOBLE)
    .join(".*")
    .split(SIMPLE)
    .join("[^/]*");
  return new RegExp(`^${cuerpo}$`);
}

/**
 * ¿Algún patrón cubriría un archivo dentro de esta área?
 *
 * `sufijo` importa: el include de las pruebas exige `.test.ts`, así que
 * comprobarlo con un `.ts` normal daría un falso negativo.
 */
function patronCubre(patrones: string[], area: string, sufijo = ".ts"): boolean {
  const ejemplos = [`${area}/archivo${sufijo}`, `${area}/sub/archivo${sufijo}`, `${area}/sub/otra/archivo${sufijo}`];
  return patrones.some((p) => {
    const re = globARegex(p);
    return ejemplos.some((e) => re.test(e));
  });
}

const AREAS = descubrirAreas();

describe("red de seguridad: ninguna carpeta de codigo queda fuera", () => {
  it("descubre las areas de codigo del repositorio", () => {
    // Si esto baja de 5, es que el descubrimiento se rompió y las
    // comprobaciones de abajo estarían pasando en vacío.
    expect(AREAS.length).toBeGreaterThanOrEqual(5);
    expect(AREAS).toContain("src");
    expect(AREAS).toContain("apps/workers");
  });

  it("cada area esta incluida en la configuracion de PRUEBAS", () => {
    // Se quitan los comentarios ANTES de extraer: uno de ellos menciona
    // `packages/**` y hacía que la extracción saltara de comilla a comilla,
    // tragándose el patrón de `src` y dando un falso negativo.
    const config = quitarComentarios(leer("vitest.config.ts"));
    const patrones = [...config.matchAll(/"([^"\n]*\*[^"\n]*)"/g)].map((m) => m[1]);
    const sinCubrir = AREAS.filter(
      (area) => !patronCubre(patrones, area, ".test.ts") && !patronCubre(patrones, area, ".test.tsx")
    );
    expect(
      sinCubrir,
      `Estas áreas tienen código pero sus pruebas NO se ejecutarían nunca.\n` +
        `Añade su patrón al 'include' de vitest.config.ts:\n` +
        sinCubrir.map((a) => `  "${a}/**/*.test.ts",`).join("\n")
    ).toEqual([]);
  });

  it("cada area esta incluida en algun TYPECHECK", () => {
    const raiz = leerJsonConComentarios("tsconfig.json");
    const incluyeRaiz = (raiz.include as string[]) || [];
    const excluyeRaiz = (raiz.exclude as string[]) || [];

    const sinCubrir = AREAS.filter((area) => {
      // Cubierta por el tsconfig de la raíz, salvo que esté excluida entera.
      const excluidaEntera = excluyeRaiz.some((p) => p === `${area}/**` || p === `${area}/**/*`);
      if (!excluidaEntera && patronCubre(incluyeRaiz, area)) return false;
      // O bien tiene su propio tsconfig (el caso de apps/admin-web).
      try {
        leerJsonConComentarios(`${area}/tsconfig.json`);
        return false;
      } catch {
        return true;
      }
    });

    expect(
      sinCubrir,
      `Estas áreas tienen código que NADIE comprueba de tipos:\n` +
        sinCubrir.map((a) => `  ${a}`).join("\n") +
        `\nAñádelas al 'include' de tsconfig.json o dales su propio tsconfig.`
    ).toEqual([]);
  });

  it("ninguna area esta silenciada en el LINT", () => {
    const config = leer("eslint.config.mjs");
    const bloque = config.slice(config.indexOf("ignores:"));
    const silenciadas = AREAS.filter((area) => bloque.includes(`"${area}/"`) || bloque.includes(`"${area}"`));
    expect(
      silenciadas,
      `Estas áreas tienen código y están en la lista de ignorados de eslint:\n` +
        silenciadas.map((a) => `  ${a}`).join("\n")
    ).toEqual([]);
  });

  it("el arranque de los trabajos automaticos esta cubierto por pruebas", () => {
    // `apps/workers/src/index.ts` decide QUÉ corre en producción. Estuvo un
    // año sin una sola prueba porque su carpeta no entraba en el include.
    const config = leer("vitest.config.ts");
    expect(config).toContain("apps/workers/**/*.test.ts");
  });
});
