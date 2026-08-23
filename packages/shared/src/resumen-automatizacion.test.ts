import { describe, expect, it } from "vitest";

import { construirResumen, type DatosResumen } from "./resumen-automatizacion";

const TODO_ENCENDIDO: DatosResumen = {
  nombreTienda: "Becam",
  facturaPedidos: true,
  soloRegistraPedidos: false,
  creaClienteEnAlegra: true,
  mandaAlegra: { inventory: true, prices: true, publication: true },
  sinExistenciasSeMarcaAgotado: true,
  motorPedidosEncendido: true,
  motorRepasoPedidosEncendido: true,
  motorPreciosEncendido: true,
  motorExistenciasEncendido: true,
};

const frases = (d: DatosResumen) => construirResumen(d).flatMap((b) => b.frases);
const textos = (d: DatosResumen) =>
  frases(d)
    .map((f) => f.texto)
    .join(" ");

describe("resumen de qué va a pasar", () => {
  it("con todo en orden no dice que algo no ocurra", () => {
    expect(frases(TODO_ENCENDIDO).some((f) => f.estado === "no_ocurre")).toBe(false);
  });

  it("avisa cuando la regla está puesta pero el motor apagado", () => {
    // Éste es el caso que nadie podía ver: la configuración es correcta y aun
    // así no pasa nada, porque el trabajo está apagado en OTRA pantalla.
    const d = { ...TODO_ENCENDIDO, motorPedidosEncendido: false, motorRepasoPedidosEncendido: false };
    const f = frases(d).find((x) => x.estado === "no_ocurre");
    expect(f).toBeTruthy();
    expect(f!.texto).toContain("nada de esto ocurre");
    expect(f!.porque).toContain("apagados");
  });

  it("distingue 'al instante' de 'en el repaso periódico'", () => {
    const d = { ...TODO_ENCENDIDO, motorPedidosEncendido: false };
    expect(textos(d)).toContain("repaso periódico");
  });

  it("dice que no se puede sobrevender cuando manda Alegra", () => {
    expect(textos(TODO_ENCENDIDO)).toContain("no se puede sobrevender");
  });

  it("avisa del riesgo cuando el inventario lo lleva la tienda", () => {
    const d = { ...TODO_ENCENDIDO, mandaAlegra: { ...TODO_ENCENDIDO.mandaAlegra, inventory: false } };
    const f = frases(d).find((x) => x.texto.includes("las lleva la tienda"));
    expect(f?.porque).toContain("vender unidades que Alegra no tenga");
  });

  it("dice si un producto sin stock se agota o se despublica", () => {
    expect(textos(TODO_ENCENDIDO)).toContain("AGOTADO");
    expect(textos({ ...TODO_ENCENDIDO, sinExistenciasSeMarcaAgotado: false })).toContain("DESPUBLICA");
  });

  it("avisa si no se da de alta al cliente nuevo", () => {
    const d = { ...TODO_ENCENDIDO, creaClienteEnAlegra: false };
    const f = frases(d).find((x) => x.texto.includes("NO se da de alta"));
    expect(f?.porque).toContain("no se podrán facturar");
  });

  it("si sólo se registra el pedido, lo dice sin rodeos", () => {
    const d = { ...TODO_ENCENDIDO, facturaPedidos: false, soloRegistraPedidos: true };
    expect(textos(d)).toContain("NO se emite factura");
  });

  it("siempre explica qué pasa con lo que no se puede facturar", () => {
    const b = construirResumen(TODO_ENCENDIDO).find((x) => x.titulo.includes("no se puede facturar"));
    expect(b).toBeTruthy();
    expect(b!.frases.some((f) => f.texto.includes("No se reintenta"))).toBe(true);
  });

  it("cubre los tres escenarios siempre, pase lo que pase", () => {
    for (const d of [TODO_ENCENDIDO, { ...TODO_ENCENDIDO, facturaPedidos: false, soloRegistraPedidos: false }]) {
      expect(construirResumen(d).map((b) => b.titulo)).toEqual([
        "Cuando entra un pedido",
        "El catálogo de la tienda",
        "Si un pedido no se puede facturar",
      ]);
    }
  });
});

describe("cada frase dice DÓNDE se cambia", () => {
  it("las que no ocurren llevan a Trabajos automáticos", () => {
    // Es la frase más importante: la regla está bien y aun así no pasa nada.
    // Sin el enlace, el usuario no sabe siquiera que existe esa pantalla.
    const d = { ...TODO_ENCENDIDO, motorPedidosEncendido: false, motorRepasoPedidosEncendido: false };
    const f = frases(d).filter((x) => x.estado === "no_ocurre");
    expect(f.length).toBeGreaterThan(0);
    for (const x of f) {
      expect(x.accion?.href, x.texto).toBe("/superadmin/workers");
    }
  });

  it("las de catálogo llevan a quién manda", () => {
    for (const x of frases(TODO_ENCENDIDO).filter(
      (f) => f.texto.includes("existencias") || f.texto.includes("precio")
    )) {
      expect(x.accion?.href, x.texto).toBe("/settings/stores");
    }
  });

  it("las de pedidos llevan a su bloque de reglas", () => {
    const f = frases(TODO_ENCENDIDO).find((x) => x.texto.includes("se emite su factura"));
    expect(f?.accion?.href).toBe("#pedidos-y-facturacion");
  });

  it("si no se da de alta al cliente, lleva a las reglas de clientes", () => {
    const d = { ...TODO_ENCENDIDO, creaClienteEnAlegra: false };
    const f = frases(d).find((x) => x.texto.includes("NO se da de alta"));
    expect(f?.accion?.href).toBe("#clientes");
  });

  it("toda acción tiene texto en imperativo y destino", () => {
    const d = { ...TODO_ENCENDIDO, motorPreciosEncendido: false, motorExistenciasEncendido: false };
    for (const x of frases(d)) {
      if (!x.accion) continue;
      expect(x.accion.texto.length, x.texto).toBeGreaterThan(8);
      expect(x.accion.href.length, x.texto).toBeGreaterThan(1);
    }
  });
});
