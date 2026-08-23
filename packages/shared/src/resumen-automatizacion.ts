/**
 * Qué va a pasar DE VERDAD con esta tienda.
 *
 * POR QUÉ EXISTE
 * --------------
 * La configuración vive repartida en decenas de interruptores, y encima sólo
 * surte efecto si el trabajo que la ejecuta está encendido —y eso se decide en
 * OTRA pantalla—. El resultado es que nadie, ni el cliente ni nosotros, podía
 * responder a "¿qué pasa cuando entra un pedido?" sin cruzar dos pantallas y
 * saberse de memoria qué worker hace qué.
 *
 * Esto junta las dos cosas y lo dice en una frase por escenario:
 *   la REGLA (qué se hará)  +  el MOTOR (si algo lo hará)
 *
 * Es puro, para poder probarlo sin base de datos ni navegador.
 */
export type EstadoFrase = "ok" | "no_ocurre" | "atencion";

export type AccionResumen = {
  /** Qué se va a hacer, en imperativo. */
  texto: string;
  /** A dónde lleva. Ancla de esta misma página o ruta de otra. */
  href: string;
};

export type FraseResumen = {
  estado: EstadoFrase;
  texto: string;
  /** Por qué no ocurre, cuando aplica. */
  porque?: string;
  /** Dónde se cambia esto. Sin esto, el resumen sólo informa y hay que ir a
   *  buscar el interruptor a mano por toda la pantalla. */
  accion?: AccionResumen;
};

export type BloqueResumen = {
  titulo: string;
  frases: FraseResumen[];
};

export type DatosResumen = {
  nombreTienda: string;
  /** Reglas configuradas. */
  facturaPedidos: boolean;
  soloRegistraPedidos: boolean;
  creaClienteEnAlegra: boolean;
  mandaAlegra: { inventory: boolean; prices: boolean; publication: boolean };
  sinExistenciasSeMarcaAgotado: boolean;
  /** Motores: si el trabajo que lo ejecuta está encendido. */
  motorPedidosEncendido: boolean;
  motorRepasoPedidosEncendido: boolean;
  motorPreciosEncendido: boolean;
  motorExistenciasEncendido: boolean;
};

export function construirResumen(d: DatosResumen): BloqueResumen[] {
  const bloques: BloqueResumen[] = [];

  // ── Pedidos ──────────────────────────────────────────────────────────────
  const pedidos: FraseResumen[] = [];
  if (d.facturaPedidos) {
    pedidos.push({
      estado: "ok",
      texto: "El pedido se registra en Alegra y se emite su factura.",
      accion: { texto: "Cambiar reglas de pedidos", href: "#pedidos-y-facturacion" },
    });
  } else if (d.soloRegistraPedidos) {
    pedidos.push({
      estado: "atencion",
      texto: "El pedido se registra en Alegra, pero NO se emite factura.",
      accion: { texto: "Cambiar reglas de pedidos", href: "#pedidos-y-facturacion" },
    });
  } else {
    pedidos.push({
      estado: "atencion",
      texto: "Los pedidos no se llevan a Alegra.",
      accion: { texto: "Cambiar reglas de pedidos", href: "#pedidos-y-facturacion" },
    });
  }

  if (d.facturaPedidos || d.soloRegistraPedidos) {
    pedidos.push(
      d.creaClienteEnAlegra
        ? { estado: "ok", texto: "Si el comprador no existe en Alegra, se da de alta." }
        : {
            estado: "atencion",
            texto: "Si el comprador no existe en Alegra, NO se da de alta.",
            porque: "Los pedidos de clientes nuevos no se podrán facturar.",
            accion: { texto: "Cambiar reglas de clientes", href: "#clientes" },
          }
    );

    if (!d.motorPedidosEncendido && !d.motorRepasoPedidosEncendido) {
      pedidos.push({
        estado: "no_ocurre",
        texto: "Ahora mismo nada de esto ocurre.",
        porque: 'Los trabajos "Recepción de pedidos" y "Repaso de pedidos" están apagados.',
        accion: { texto: "Ir a Trabajos automáticos", href: "/superadmin/workers" },
      });
    } else if (!d.motorPedidosEncendido) {
      pedidos.push({
        estado: "atencion",
        texto: "No ocurre al instante, sino en el repaso periódico.",
        porque: '"Recepción de pedidos" está apagado; sólo trabaja "Repaso de pedidos".',
        accion: { texto: "Ir a Trabajos automáticos", href: "/superadmin/workers" },
      });
    }
  }
  bloques.push({ titulo: "Cuando entra un pedido", frases: pedidos });

  // ── Catálogo ─────────────────────────────────────────────────────────────
  const catalogo: FraseResumen[] = [];
  catalogo.push(
    d.mandaAlegra.prices
      ? {
          estado: "ok",
          texto: "El precio de la tienda lo fija la lista de Alegra.",
          accion: { texto: "Cambiar quién manda", href: "/settings/stores" },
        }
      : {
          estado: "atencion",
          texto: "El precio lo fija la tienda; Alegra no lo toca.",
          accion: { texto: "Cambiar quién manda", href: "/settings/stores" },
        }
  );
  catalogo.push(
    d.mandaAlegra.inventory
      ? {
          estado: "ok",
          texto: "Las existencias de la tienda las fija Alegra: no se puede sobrevender.",
          accion: { texto: "Cambiar quién manda", href: "/settings/stores" },
        }
      : {
          estado: "atencion",
          texto: "Las existencias las lleva la tienda; Alegra no las ajusta.",
          porque: "La tienda podrá vender unidades que Alegra no tenga.",
          accion: { texto: "Cambiar quién manda", href: "/settings/stores" },
        }
  );
  if (d.mandaAlegra.publication) {
    catalogo.push({
      estado: "ok",
      texto: d.sinExistenciasSeMarcaAgotado
        ? "Un producto sin unidades se queda visible como AGOTADO."
        : "Un producto sin unidades se DESPUBLICA de la tienda.",
    });
  }

  const necesitaMotores = d.mandaAlegra.prices || d.mandaAlegra.inventory || d.mandaAlegra.publication;
  if (necesitaMotores && !d.motorPreciosEncendido && !d.motorExistenciasEncendido) {
    catalogo.push({
      estado: "no_ocurre",
      texto: "Ahora mismo nada de esto se aplica.",
      porque: 'Los trabajos "Precios y publicación" y "Existencias" están apagados.',
      accion: { texto: "Ir a Trabajos automáticos", href: "/superadmin/workers" },
    });
  } else if (d.mandaAlegra.inventory && !d.motorExistenciasEncendido) {
    catalogo.push({
      estado: "no_ocurre",
      texto: "Las existencias no se están ajustando.",
      porque: 'El trabajo "Existencias desde Alegra" está apagado.',
      accion: { texto: "Ir a Trabajos automáticos", href: "/superadmin/workers" },
    });
  } else if (d.mandaAlegra.prices && !d.motorPreciosEncendido) {
    catalogo.push({
      estado: "no_ocurre",
      texto: "Los precios no se están aplicando.",
      porque: 'El trabajo "Precios y publicación desde Alegra" está apagado.',
      accion: { texto: "Ir a Trabajos automáticos", href: "/superadmin/workers" },
    });
  }
  bloques.push({ titulo: "El catálogo de la tienda", frases: catalogo });

  // ── Lo que no se puede facturar ──────────────────────────────────────────
  bloques.push({
    titulo: "Si un pedido no se puede facturar",
    frases: [
      {
        estado: "ok",
        texto: "Se marca con el motivo concreto y qué hace falta para arreglarlo.",
      },
      {
        estado: "ok",
        texto: "No se reintenta una y otra vez: espera a que alguien complete el dato.",
        porque: "Falta la cédula del cliente, o un producto sin enlazar con Alegra.",
      },
    ],
  });

  return bloques;
}
