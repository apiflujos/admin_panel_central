/**
 * Lo que HACE FALTA para poder facturar, dicho antes de vender.
 *
 * POR QUÉ EXISTE
 * --------------
 * El motor ya comprobaba estos ajustes, pero sólo en el instante de emitir la
 * factura, y el resultado acababa en el registro con un código crudo:
 *
 *   «Missing invoice settings»     · request: { missing: ["resolution_id"] }
 *   «Invoice settings incomplete»  · 278 veces
 *   «Invoice settings missing warehouse» · 24 veces
 *
 * Es decir: lo obligatorio se descubría cuando ya se había perdido la venta, y
 * en un sitio donde nadie mira. La pantalla de configuración no decía nada.
 *
 * Esta pieza es la MISMA regla, movida a un sitio donde puedan usarla las dos:
 * el motor para frenar, y la pantalla para avisar antes. Si vivieran separadas
 * acabarían discrepando, como ya nos ha pasado con otras dos comprobaciones.
 *
 * NO añade requisitos nuevos: las condiciones son exactamente las que el motor
 * aplicaba. Sólo se explican.
 */
import { z } from "zod";

export const ajustesFacturacionSchema = z.object({
  /** Si está apagado, no hay nada obligatorio: no se factura. */
  generateInvoice: z.boolean().default(false),
  /** Factura electrónica: es lo que convierte la resolución en obligatoria. */
  einvoiceEnabled: z.boolean().default(false),
  resolutionId: z.string().default(""),
  warehouseId: z.string().default(""),
  /** Si se registra el pago, hacen falta forma de pago y cuenta. */
  applyPayment: z.boolean().default(false),
  paymentMethod: z.string().default(""),
  bankAccountId: z.string().default(""),
});

export type AjustesFacturacion = z.input<typeof ajustesFacturacionSchema>;

export type GravedadRequisito = "bloquea" | "incompleta";

export type RequisitoFaltante = {
  /** Código estable, el mismo que ya usaba el motor. */
  codigo: "resolution_id" | "payment_method" | "bank_account_id" | "warehouse_id";
  /** Qué falta, en una línea. */
  que: string;
  /** Por qué es obligatorio. */
  porQue: string;
  /** Qué hay que hacer. */
  comoSeArregla: string;
  gravedad: GravedadRequisito;
};

export type RevisionConfiguracion = {
  /** true si no falta nada que bloquee. */
  listo: boolean;
  /** true cuando la facturación está apagada: entonces no hay obligaciones. */
  noAplica: boolean;
  faltantes: RequisitoFaltante[];
};

const REQUISITOS: Record<RequisitoFaltante["codigo"], Omit<RequisitoFaltante, "codigo" | "gravedad">> = {
  resolution_id: {
    que: "Resolución de facturación",
    porQue:
      "Con factura electrónica activada, la DIAN exige el número de resolución. Sin él Alegra no puede emitir y el pedido se queda sin facturar.",
    comoSeArregla: "Elegir la resolución vigente en los ajustes de facturación de esta tienda.",
  },
  payment_method: {
    que: "Forma de pago",
    porQue:
      "Se registra el pago junto con la factura, y Alegra exige la forma de pago cuando el pago es de contado. Sin ella la factura sale, pero sin el pago aplicado.",
    comoSeArregla: "Elegir la forma de pago, o dejar de registrar el pago automáticamente.",
  },
  bank_account_id: {
    que: "Cuenta de banco",
    porQue: "El pago necesita una cuenta donde asentarse. Sin ella la factura sale, pero el pago queda sin registrar.",
    comoSeArregla: "Elegir la cuenta, o dejar de registrar el pago automáticamente.",
  },
  warehouse_id: {
    que: "Bodega",
    porQue:
      "Sin bodega elegida, el inventario se toma de TODAS las bodegas sumadas. Funciona, pero puede no ser lo que la contabilidad espera.",
    comoSeArregla: "Elegir la bodega desde la que se descuenta, si la contabilidad usa más de una.",
  },
};

const falta = (codigo: RequisitoFaltante["codigo"], gravedad: GravedadRequisito): RequisitoFaltante => ({
  codigo,
  gravedad,
  ...REQUISITOS[codigo],
});

const vacio = (valor: unknown) => !String(valor ?? "").trim();

/**
 * ¿Se puede facturar con esta configuración?
 *
 * Las condiciones son EXACTAMENTE las que ya aplicaba el motor; esto no
 * endurece nada. `bloquea` es lo que impide emitir; `incompleta` es lo que sale
 * adelante pero deja algo a medias.
 */
export function revisarConfiguracionObligatoria(ajustes: unknown): RevisionConfiguracion {
  const parsed = ajustesFacturacionSchema.safeParse(ajustes ?? {});
  const a = parsed.success ? parsed.data : ajustesFacturacionSchema.parse({});

  // Facturación apagada: no hay obligaciones que cumplir. Decirlo evita el
  // ruido de exigir datos a quien no va a facturar.
  if (!a.generateInvoice) return { listo: true, noAplica: true, faltantes: [] };

  const faltantes: RequisitoFaltante[] = [];

  if (a.einvoiceEnabled && vacio(a.resolutionId)) faltantes.push(falta("resolution_id", "bloquea"));
  if (a.applyPayment && vacio(a.paymentMethod)) faltantes.push(falta("payment_method", "incompleta"));
  if (a.applyPayment && vacio(a.bankAccountId)) faltantes.push(falta("bank_account_id", "incompleta"));
  if (vacio(a.warehouseId)) faltantes.push(falta("warehouse_id", "incompleta"));

  return {
    listo: !faltantes.some((f) => f.gravedad === "bloquea"),
    noAplica: false,
    faltantes,
  };
}

/** Una frase para encabezar el aviso. */
export function resumirRevision(revision: RevisionConfiguracion, nombreTienda: string) {
  if (revision.noAplica) return `${nombreTienda} no factura: no hay nada obligatorio que completar.`;
  if (!revision.faltantes.length) return `${nombreTienda} tiene todo lo obligatorio para facturar.`;
  const bloqueos = revision.faltantes.filter((f) => f.gravedad === "bloquea").length;
  if (bloqueos) {
    return `${nombreTienda} NO puede facturar: falta ${bloqueos === 1 ? "un dato obligatorio" : `${bloqueos} datos obligatorios`}.`;
  }
  return `${nombreTienda} puede facturar, pero algo quedará incompleto.`;
}
