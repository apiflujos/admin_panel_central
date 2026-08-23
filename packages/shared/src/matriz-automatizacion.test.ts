import { describe, expect, it } from "vitest";

import { construirMatriz, resumirMatriz, type DatosTienda } from "./matriz-automatizacion";

const TIENDA_LISTA: DatosTienda = {
  storeId: 1,
  storeName: "Becam",
  tieneShopify: true,
  tieneCuentaAlegra: true,
  facturaPedidos: true,
  creaClienteEnAlegra: true,
  tieneListaDePrecios: true,
  tieneBodega: true,
  mandaAlegraEnPrecios: true,
  mandaAlegraEnPublicacion: true,
  mandaAlegraEnInventario: true,
  pedidosAtascados: { sinIdentificacion: 0, productoSinEnlazar: 0, otros: 0 },
};

const TODO_ENCENDIDO = {
  "webhook-dispatch": true,
  "orders-sync": true,
  "products-sync": true,
  "inventory-adjustments": true,
};

const cruce = (t: DatosTienda, motores: Record<string, boolean>, key: string) =>
  construirMatriz([t], motores)[0].cruces.find((c) => c.workerKey === key)!;

describe("matriz tienda x trabajo", () => {
  it("todo listo y encendido: funcionando", () => {
    for (const c of construirMatriz([TIENDA_LISTA], TODO_ENCENDIDO)[0].cruces) {
      expect(c.estado, c.workerKey).toBe("funcionando");
    }
  });

  it("todo listo pero apagado: apagado, no 'le falta algo'", () => {
    // Distinguir las dos cosas es el objetivo: apagar es una decisión; que
    // falte un dato es un problema que alguien tiene que arreglar.
    const c = cruce(TIENDA_LISTA, { ...TODO_ENCENDIDO, "webhook-dispatch": false }, "webhook-dispatch");
    expect(c.estado).toBe("apagado");
    expect(c.faltantes).toEqual([]);
  });

  it("encendido y sin cuenta de Alegra: le falta algo, y dice cuál", () => {
    const c = cruce({ ...TIENDA_LISTA, tieneCuentaAlegra: false }, TODO_ENCENDIDO, "webhook-dispatch");
    expect(c.estado).toBe("le_falta_algo");
    expect(c.faltantes.join(" ")).toContain("cuenta de Alegra");
  });

  it("facturar sin dar de alta al cliente nuevo se marca como carencia", () => {
    const c = cruce({ ...TIENDA_LISTA, creaClienteEnAlegra: false }, TODO_ENCENDIDO, "webhook-dispatch");
    expect(c.estado).toBe("le_falta_algo");
    expect(c.faltantes.join(" ")).toContain("compradores nuevos");
  });

  it("si la tienda manda sobre el inventario, ese trabajo NO APLICA", () => {
    // Es el caso de quien opera en Shopify y sólo quiere facturar.
    const c = cruce({ ...TIENDA_LISTA, mandaAlegraEnInventario: false }, TODO_ENCENDIDO, "inventory-adjustments");
    expect(c.estado).toBe("no_aplica");
    expect(c.faltantes).toEqual([]);
  });

  it("sin lista de precios no se puede aplicar precio, y lo dice", () => {
    const c = cruce({ ...TIENDA_LISTA, tieneListaDePrecios: false }, TODO_ENCENDIDO, "products-sync");
    expect(c.faltantes.join(" ")).toContain("lista de precios");
  });

  it("sin bodega elegida AVISA pero no bloquea: el motor suma todas", () => {
    // Falso positivo que tuve: marcarlo como problema hacía que la matriz
    // señalara como roto algo que funciona. Una matriz que grita en falso deja
    // de creerse, y entonces tampoco se ven los problemas de verdad.
    const c = cruce({ ...TIENDA_LISTA, tieneBodega: false }, TODO_ENCENDIDO, "inventory-adjustments");
    expect(c.faltantes).toEqual([]);
    expect(c.estado).toBe("funcionando");
    expect(c.notas.join(" ")).toContain("todas las bodegas");
  });

  it("lo que SÍ impide trabajar va en faltantes, no en notas", () => {
    const c = cruce({ ...TIENDA_LISTA, tieneCuentaAlegra: false }, TODO_ENCENDIDO, "inventory-adjustments");
    expect(c.faltantes.join(" ")).toContain("cuenta de Alegra");
    expect(c.estado).toBe("le_falta_algo");
  });

  it("cuenta los pedidos atascados y separa por motivo", () => {
    // El caso que planteó el usuario: el contacto pasa, el producto no.
    const c = cruce(
      { ...TIENDA_LISTA, pedidosAtascados: { sinIdentificacion: 4, productoSinEnlazar: 2, otros: 1 } },
      TODO_ENCENDIDO,
      "webhook-dispatch"
    );
    expect(c.atascados?.cantidad).toBe(7);
    expect(c.atascados?.detalle).toContain("4 sin cédula");
    expect(c.atascados?.detalle).toContain("2 con productos sin enlazar");
  });

  it("sin atascos no inventa el dato", () => {
    expect(cruce(TIENDA_LISTA, TODO_ENCENDIDO, "webhook-dispatch").atascados).toBeUndefined();
  });

  it("el resumen cuenta cada estado por separado", () => {
    const filas = construirMatriz(
      [TIENDA_LISTA, { ...TIENDA_LISTA, storeId: 3, storeName: "Belia", tieneCuentaAlegra: false }],
      { ...TODO_ENCENDIDO, "products-sync": false }
    );
    const r = resumirMatriz(filas);
    expect(r.funcionando + r.apagados + r.conProblemas).toBeGreaterThan(0);
    expect(r.conProblemas).toBeGreaterThan(0);
  });
});

describe("el eje de dirección", () => {
  it("cada cruce dice hacia dónde mueve las cosas", () => {
    for (const c of construirMatriz([TIENDA_LISTA], TODO_ENCENDIDO)[0].cruces) {
      expect(["shopify_a_alegra", "alegra_a_shopify"], c.workerKey).toContain(c.direccion);
    }
  });

  it("los pedidos SUBEN a Alegra; precios y existencias BAJAN a la tienda", () => {
    const cruces = construirMatriz([TIENDA_LISTA], TODO_ENCENDIDO)[0].cruces;
    const dir = (k: string) => cruces.find((c) => c.workerKey === k)!.direccion;
    expect(dir("webhook-dispatch")).toBe("shopify_a_alegra");
    expect(dir("orders-sync")).toBe("shopify_a_alegra");
    expect(dir("products-sync")).toBe("alegra_a_shopify");
    expect(dir("inventory-adjustments")).toBe("alegra_a_shopify");
  });

  it("quien opera en la tienda y sólo factura: nada baja hacia la tienda", () => {
    // El caso de Becam según lo describió el usuario. Debe verse de un vistazo
    // que lo único que se mueve es el pedido hacia Alegra.
    const soloFacturar: DatosTienda = {
      ...TIENDA_LISTA,
      mandaAlegraEnPrecios: false,
      mandaAlegraEnPublicacion: false,
      mandaAlegraEnInventario: false,
    };
    const cruces = construirMatriz([soloFacturar], TODO_ENCENDIDO)[0].cruces;
    const bajan = cruces.filter((c) => c.direccion === "alegra_a_shopify");
    expect(bajan.length).toBeGreaterThan(0);
    for (const c of bajan) expect(c.estado, c.workerKey).toBe("no_aplica");
    const suben = cruces.filter((c) => c.direccion === "shopify_a_alegra");
    for (const c of suben) expect(c.estado, c.workerKey).toBe("funcionando");
  });
});
