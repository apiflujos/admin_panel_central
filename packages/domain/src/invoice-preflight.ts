/**
 * ¿Se puede facturar este pedido, SÍ o NO, y por qué no?
 *
 * POR QUÉ EXISTE
 * --------------
 * Los requisitos de una factura en Colombia los pone la DIAN, no la
 * configuración: da igual quién "mande" sobre el inventario, una factura
 * necesita identificar al cliente. Hasta ahora eso se descubría tarde —
 * mandábamos el contacto a Alegra y Alegra respondía 400— y el pedido volvía a
 * la cola de reintentos a fallar otra vez, indefinidamente.
 *
 * Este prever se ejecuta ANTES de tocar nada. Un pedido al que le falta un dato
 * obligatorio no se intenta: se marca, se explica por qué y qué hay que hacer
 * para arreglarlo, y NO se reintenta, porque el resultado sería el mismo.
 *
 * Distingue dos cosas que no son iguales:
 *   - BLOQUEO: falta un dato sin el cual la factura no puede existir. No se
 *     reintenta. Necesita que una persona complete el dato.
 *   - AVISO: se puede facturar, pero algo quedará incompleto.
 */

export type MotivoBloqueo = {
  /** Código estable para agrupar y contar. */
  codigo: "sin_identificacion" | "sin_nombre" | "sin_lineas" | "sin_moneda" | "sin_total" | "articulos_sin_mapear";
  /** Qué falta, en lenguaje de negocio. */
  motivo: string;
  /** Qué hay que hacer para que se pueda facturar. */
  comoSeArregla: string;
};

export type ResultadoPreflight = {
  facturable: boolean;
  /** true si volver a intentarlo daría el mismo resultado. */
  permanente: boolean;
  bloqueos: MotivoBloqueo[];
  avisos: string[];
};

export type PedidoParaFacturar = {
  identificacion?: string | null;
  nombreCliente?: string | null;
  email?: string | null;
  moneda?: string | null;
  total?: string | number | null;
  lineas?: Array<{ alegraItemId?: string | number | null; nombre?: string | null }> | null;
};

const BLOQUEOS: Record<MotivoBloqueo["codigo"], Omit<MotivoBloqueo, "codigo">> = {
  sin_identificacion: {
    motivo: "El pedido no trae el documento de identidad del cliente.",
    comoSeArregla:
      "Pedir la cédula o el NIT en el checkout, o cargarla a mano en el pedido. Una factura en Colombia no puede emitirse sin identificar al cliente.",
  },
  sin_nombre: {
    motivo: "El pedido no trae el nombre del cliente.",
    comoSeArregla: "Completar el nombre en el pedido antes de facturar.",
  },
  sin_lineas: {
    motivo: "El pedido no tiene productos.",
    comoSeArregla: "Revisar el pedido en la tienda: una factura sin líneas no es válida.",
  },
  sin_moneda: {
    motivo: "El pedido no indica la moneda.",
    comoSeArregla: "Revisar la configuración de la tienda.",
  },
  sin_total: {
    motivo: "El pedido no indica el total.",
    comoSeArregla: "Revisar el pedido en la tienda.",
  },
  articulos_sin_mapear: {
    motivo: "Hay productos del pedido que no existen en Alegra.",
    comoSeArregla:
      "Enlazar esos productos con su artículo de Alegra, o crearlos allí, antes de poder facturar el pedido.",
  },
};

function bloqueo(codigo: MotivoBloqueo["codigo"], detalle?: string): MotivoBloqueo {
  const base = BLOQUEOS[codigo];
  return { codigo, motivo: detalle ? `${base.motivo} ${detalle}` : base.motivo, comoSeArregla: base.comoSeArregla };
}

const tieneTexto = (valor: unknown) => typeof valor === "string" && valor.trim().length > 0;

/**
 * @param pedido datos ya extraídos del pedido de la tienda
 * @param opciones `exigirIdentificacion` se desactiva sólo si el cliente NO
 *   emite factura electrónica; el resto de bloqueos aplican siempre.
 */
export function preflightDeFacturacion(
  pedido: PedidoParaFacturar,
  opciones: { exigirIdentificacion?: boolean } = {}
): ResultadoPreflight {
  const exigirIdentificacion = opciones.exigirIdentificacion !== false;
  const bloqueos: MotivoBloqueo[] = [];
  const avisos: string[] = [];

  if (exigirIdentificacion && !tieneTexto(pedido.identificacion)) {
    bloqueos.push(bloqueo("sin_identificacion"));
  }
  if (!tieneTexto(pedido.nombreCliente)) {
    bloqueos.push(bloqueo("sin_nombre"));
  }

  const lineas = Array.isArray(pedido.lineas) ? pedido.lineas : [];
  if (!lineas.length) {
    bloqueos.push(bloqueo("sin_lineas"));
  } else {
    const sinMapear = lineas.filter(
      (l) => l.alegraItemId === undefined || l.alegraItemId === null || l.alegraItemId === ""
    );
    if (sinMapear.length) {
      const ejemplos = sinMapear
        .map((l) => l.nombre)
        .filter(tieneTexto)
        .slice(0, 3)
        .join(", ");
      bloqueos.push(
        bloqueo(
          "articulos_sin_mapear",
          `Son ${sinMapear.length} de ${lineas.length}${ejemplos ? `: ${ejemplos}` : ""}.`
        )
      );
    }
  }

  if (!tieneTexto(pedido.moneda)) {
    bloqueos.push(bloqueo("sin_moneda"));
  }
  const total = pedido.total;
  if (total === null || total === undefined || String(total).trim() === "") {
    bloqueos.push(bloqueo("sin_total"));
  }

  // El correo no impide emitir la factura, pero sin él la DIAN no tiene a dónde
  // enviarla y el cliente no la recibe.
  if (!tieneTexto(pedido.email)) {
    avisos.push("El pedido no trae correo del cliente: la factura no se le podrá enviar.");
  }

  return {
    facturable: bloqueos.length === 0,
    // Todos los bloqueos son de DATO QUE FALTA: reintentar no los arregla.
    permanente: bloqueos.length > 0,
    bloqueos,
    avisos,
  };
}

/** Una línea corta para el log y para la pantalla de operaciones. */
export function resumirBloqueos(resultado: ResultadoPreflight) {
  if (resultado.facturable) return "";
  return resultado.bloqueos.map((b) => b.motivo).join(" ");
}
