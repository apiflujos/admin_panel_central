/**
 * Avisos cuando la configuración de una tienda se contradice a sí misma.
 *
 * Cada ajuste por separado parece razonable; el problema aparece al combinarlos.
 * Antes eso sólo se descubría cuando algo fallaba en producción: por ejemplo,
 * facturar con «dar de alta al cliente nuevo» apagado hace que todo comprador
 * nuevo rebote, y nadie relaciona una cosa con la otra.
 *
 * Es puro y sin dependencias para poder probarlo y usarlo en la interfaz.
 */
export type AvisoCoherencia = {
  gravedad: "bloquea" | "aviso";
  titulo: string;
  detalle: string;
  comoSeArregla: string;
};

export type ConfiguracionParaRevisar = {
  tieneCuentaAlegra: boolean;
  facturaPedidos: boolean;
  creaClienteEnAlegra: boolean;
  clientesDeLaTiendaAAlegra: boolean;
  mandaAlegraEnInventario: boolean;
  enviaExistenciasHaciaAlegra: boolean;
  escribeEnLaTienda: boolean;
};

export function revisarCoherencia(c: ConfiguracionParaRevisar): AvisoCoherencia[] {
  const avisos: AvisoCoherencia[] = [];

  if (c.facturaPedidos && !c.tieneCuentaAlegra) {
    avisos.push({
      gravedad: "bloquea",
      titulo: "Se factura, pero la tienda no tiene cuenta de Alegra",
      detalle: "Sin cuenta contable asociada no se puede emitir ninguna factura.",
      comoSeArregla: "Asocia la cuenta de Alegra a esta tienda. Puede ser la misma que usa otra tienda.",
    });
  }

  if (c.facturaPedidos && !c.creaClienteEnAlegra) {
    avisos.push({
      gravedad: "bloquea",
      titulo: "Se factura, pero no se da de alta al cliente nuevo en Alegra",
      detalle:
        "Todo comprador que no exista ya en Alegra hará fallar su factura. Sólo se podría facturar a clientes repetidos.",
      comoSeArregla: 'Enciende "Dar de alta al cliente nuevo en Alegra".',
    });
  }

  if (c.facturaPedidos && !c.clientesDeLaTiendaAAlegra) {
    avisos.push({
      gravedad: "aviso",
      titulo: "Se factura, pero los clientes de la tienda no viajan a Alegra",
      detalle: "Los datos del comprador no se actualizarán en Alegra aunque cambien en la tienda.",
      comoSeArregla: 'Enciende "El cliente del pedido pasa a Alegra".',
    });
  }

  if (c.mandaAlegraEnInventario && c.enviaExistenciasHaciaAlegra) {
    avisos.push({
      gravedad: "bloquea",
      titulo: "Las existencias viajan en los dos sentidos",
      detalle:
        "Alegra manda sobre el inventario y a la vez la tienda le envía cantidades. Se pisan entre sí y el stock deja de ser fiable.",
      comoSeArregla: 'Apaga "Incluir también las existencias", o cambia el inventario a que mande la tienda.',
    });
  }

  if (!c.mandaAlegraEnInventario && c.escribeEnLaTienda) {
    avisos.push({
      gravedad: "aviso",
      titulo: "La tienda manda sobre el inventario, pero Alegra puede escribirle",
      detalle: "Con la tienda al mando, una escritura desde Alegra le cambiaría cantidades que ella controla.",
      comoSeArregla: "Revisa que la sincronización de catálogo esté apagada para esta tienda.",
    });
  }

  return avisos;
}
