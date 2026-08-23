import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const COMPONENTES = path.resolve(__dirname, "components");

/**
 * Las listas tienen que comportarse todas igual.
 *
 * No había estándar: cada pantalla resolvía la paginación a su manera —o no la
 * resolvía—. Facturas traía las 20 primeras con el desplazamiento FIJO en 0:
 * con 660 facturas en producción se veían 20 y nada indicaba que hubiera más.
 * Eso no es un problema de estética, es una lista que miente.
 */

const leer = (nombre: string) => fs.readFileSync(path.join(COMPONENTES, nombre), "utf8");

/** Listas paginadas: las que traen una página de un total mayor. */
const LISTAS_PAGINADAS = ["orders-page.tsx", "contacts-page.tsx", "products-page.tsx", "invoices-page.tsx"];

describe("estándar de listas", () => {
  it("toda lista paginada usa el MISMO componente de paginación", () => {
    const sinEstandar = LISTAS_PAGINADAS.filter((nombre) => !leer(nombre).includes("<Paginacion"));
    expect(
      sinEstandar,
      `Estas listas no usan la paginación estándar, así que dirán algo distinto\n` +
        `a las demás o no dirán nada:\n` +
        sinEstandar.map((n) => `  ${n}`).join("\n")
    ).toEqual([]);
  });

  it("ninguna lista se inventa sus propios botones de Anterior/Siguiente", () => {
    // Vivían arriba, mezclados con «Sincronizar», y sin decir cuántas páginas
    // había. El componente estándar los lleva, debajo de la tabla.
    const artesanales = LISTAS_PAGINADAS.filter((nombre) => {
      const fuente = leer(nombre);
      return /className="btn[^"]*"\s*\n?\s*href=\{`\/[a-z]+\?[^`]*offset=/.test(fuente);
    });
    expect(artesanales).toEqual([]);
  });

  it("la paginación dice en qué página estás, no solo el rango", () => {
    const componente = fs.readFileSync(path.join(COMPONENTES, "ui/paginacion.tsx"), "utf8");
    expect(componente).toContain("Página");
    expect(componente).toContain("de {paginas}");
  });

  it("el catálogo de facturas ya no trae el desplazamiento fijo en cero", () => {
    const servidor = fs.readFileSync(path.resolve(__dirname, "lib/server-api.ts"), "utf8");
    expect(servidor).not.toContain('limit: "20", offset: "0"');
  });

  it("las celdas de tabla tienen la altura acotada", () => {
    // El resumen de productos de un pedido mide 389 caracteres de media y hasta
    // 2.858: sin recorte cabían TRES pedidos en la pantalla de un ordenador.
    const estilos = fs.readFileSync(path.resolve(__dirname, "styles/components.css"), "utf8");
    const bloque = estilos.slice(estilos.indexOf(".entity-cell strong {"));
    expect(bloque.slice(0, 400)).toContain("line-clamp");
  });
});
