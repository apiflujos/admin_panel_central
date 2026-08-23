import { describe, expect, it } from "vitest";

import { revisarCoherencia, type ConfiguracionParaRevisar } from "./config-coherencia";

const COHERENTE: ConfiguracionParaRevisar = {
  tieneCuentaAlegra: true,
  facturaPedidos: true,
  creaClienteEnAlegra: true,
  clientesDeLaTiendaAAlegra: true,
  mandaAlegraEnInventario: true,
  enviaExistenciasHaciaAlegra: false,
  escribeEnLaTienda: true,
};

describe("revisión de coherencia de la configuración", () => {
  it("una configuración sensata no genera avisos", () => {
    expect(revisarCoherencia(COHERENTE)).toEqual([]);
  });

  it("facturar sin cuenta de Alegra BLOQUEA", () => {
    const a = revisarCoherencia({ ...COHERENTE, tieneCuentaAlegra: false });
    expect(a[0].gravedad).toBe("bloquea");
    expect(a[0].titulo).toContain("cuenta de Alegra");
  });

  it("facturar sin dar de alta al cliente nuevo BLOQUEA", () => {
    // Es el caso real de Belia: factura=sí, crear cliente=no. Todo comprador
    // nuevo rebotaría y nadie relacionaría una cosa con la otra.
    const a = revisarCoherencia({ ...COHERENTE, creaClienteEnAlegra: false });
    expect(a.some((x) => x.gravedad === "bloquea" && x.titulo.includes("cliente nuevo"))).toBe(true);
    expect(a[0].comoSeArregla).toContain("Dar de alta al cliente nuevo en Alegra");
  });

  it("existencias en los dos sentidos a la vez BLOQUEA", () => {
    const a = revisarCoherencia({ ...COHERENTE, enviaExistenciasHaciaAlegra: true });
    expect(a.some((x) => x.gravedad === "bloquea" && x.titulo.includes("dos sentidos"))).toBe(true);
  });

  it("la tienda al mando del stock con escritura desde Alegra AVISA", () => {
    const a = revisarCoherencia({ ...COHERENTE, mandaAlegraEnInventario: false });
    expect(a.some((x) => x.gravedad === "aviso")).toBe(true);
  });

  it("acumula TODOS los problemas, no sólo el primero", () => {
    const a = revisarCoherencia({
      ...COHERENTE,
      tieneCuentaAlegra: false,
      creaClienteEnAlegra: false,
      clientesDeLaTiendaAAlegra: false,
    });
    expect(a.length).toBeGreaterThanOrEqual(3);
  });

  it("cada aviso dice CÓMO se arregla, no sólo qué está mal", () => {
    const a = revisarCoherencia({
      tieneCuentaAlegra: false,
      facturaPedidos: true,
      creaClienteEnAlegra: false,
      clientesDeLaTiendaAAlegra: false,
      mandaAlegraEnInventario: true,
      enviaExistenciasHaciaAlegra: true,
      escribeEnLaTienda: true,
    });
    for (const x of a) {
      expect(x.comoSeArregla.length, x.titulo).toBeGreaterThan(20);
      expect(x.detalle.length, x.titulo).toBeGreaterThan(25);
    }
  });

  it("si no se factura, no se avisa de cosas de facturación", () => {
    const a = revisarCoherencia({
      ...COHERENTE,
      facturaPedidos: false,
      creaClienteEnAlegra: false,
      tieneCuentaAlegra: false,
    });
    expect(a.every((x) => !x.titulo.includes("factura"))).toBe(true);
  });
});
