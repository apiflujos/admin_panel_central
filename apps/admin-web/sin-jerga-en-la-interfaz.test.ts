import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Lo que lee el cliente no puede estar en jerga.
 *
 * La pantalla decía "Contable" y "E-commerce" en vez de Alegra y Shopify, y las
 * ayudas eran "sync", "match", "Webhooks disparan automatizaciones". El cliente
 * dijo, con razón, que no entendía qué estaba configurando.
 *
 * Esta prueba recorre los textos VISIBLES —label, help, title, subtitle— y falla
 * si vuelve a colarse una de esas palabras.
 */
const COMPONENTES = path.resolve(__dirname, "components");

function textosVisibles() {
  const salida: { archivo: string; texto: string }[] = [];
  for (const nombre of fs.readdirSync(COMPONENTES)) {
    if (!nombre.endsWith(".tsx")) continue;
    const fuente = fs.readFileSync(path.join(COMPONENTES, nombre), "utf8");
    for (const m of fuente.matchAll(/(?:label|help|title|subtitle|placeholder)="([^"]+)"/g)) {
      salida.push({ archivo: nombre, texto: m[1] });
    }
  }
  return salida;
}

// "E-commerce" se admite SÓLO como encabezado que agrupa proveedores
// (Shopify, WooCommerce): ahí el término genérico es correcto.
const PROHIBIDAS = [
  { palabra: "Contable", porque: "decir Alegra por su nombre" },
  { palabra: "\\bsync\\b", porque: "decir qué se lleva y a dónde" },
  { palabra: "\\bmatch\\b", porque: "decir 'se empareja' o 'se reconoce'" },
  { palabra: "webhook", porque: "decir 'aviso' o describir lo que ocurre" },
  { palabra: "payload", porque: "es un término interno" },
  { palabra: "endpoint", porque: "es un término interno" },
];

describe("los textos que ve el cliente no llevan jerga", () => {
  const textos = textosVisibles();

  it("hay textos que revisar", () => {
    expect(textos.length).toBeGreaterThan(50);
  });

  it.each(PROHIBIDAS)("no aparece $palabra: hay que $porque", ({ palabra }) => {
    const re = new RegExp(palabra, "i");
    const culpables = textos.filter((t) => re.test(t.texto));
    expect(culpables.map((c) => `${c.archivo}: ${c.texto}`)).toEqual([]);
  });

  it("una AYUDA que existe, explica: nada de tres palabras sueltas", () => {
    // Sólo `help`: los subtítulos de página y los marcadores de campo
    // ("Buscar...", "SKU-001 o 770123...") son cortos con razón.
    const ayudas: string[] = [];
    for (const nombre of fs.readdirSync(COMPONENTES)) {
      if (!nombre.endsWith(".tsx")) continue;
      const fuente = fs.readFileSync(path.join(COMPONENTES, nombre), "utf8");
      for (const m of fuente.matchAll(/help="([^"]+)"/g)) {
        if (m[1].length < 30) ayudas.push(`${nombre}: ${m[1]}`);
      }
    }
    expect(ayudas, "una ayuda debe decir qué hace y por qué importa").toEqual([]);
  });
});
