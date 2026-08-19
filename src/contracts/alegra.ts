/**
 * Contratos Zod de la integración Alegra de BECAM.
 *
 * Inspirado en la implementación de referencia de mim-cmms (mesa_ayuda), pero
 * ADAPTADO a la cuenta de Alegra de Becam, que tiene una configuración distinta:
 *   - `client` va como NÚMERO (id), no como objeto { id }.
 *   - `paymentForm` (CASH/CREDIT) y `paymentMethod` son OBLIGATORIOS a nivel de
 *     factura (la cuenta los exige: "La forma de pago es obligatoria").
 *   - El pago se registra por separado (createPayment), no inline.
 *
 * Todos los schemas de escritura usan `.strict()` para rechazar campos
 * inesperados y detectar bugs antes de llamar a Alegra (los errores 2035, 2006,
 * 3065, 2112 que sufrimos habrían sido evidentes con validación).
 *
 * Referencia API: https://developer.alegra.com/reference/
 */
import { z } from "zod";

const yyyyMmDd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "formato YYYY-MM-DD requerido");
const idRef = z.object({ id: z.number() }).strict();

// ── Contacto ──────────────────────────────────────────────────────────────────

/**
 * Dirección: Alegra CO rechaza una ciudad sin departamento (2112). Por eso city
 * y department van JUNTOS o no van. La línea `address` sola sí se acepta.
 */
export const alegraAddressSchema = z
  .object({
    address: z.string().min(1),
    city: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
  })
  .strict()
  .refine((a) => (a.city ? Boolean(a.department) : true), {
    message: "city requiere department (Alegra 2112: departamento inválido)",
    path: ["department"],
  });

export const alegraContactPayloadSchema = z
  .object({
    name: z.string().min(1).max(255),
    // Identificación estructurada con TIPO (CC, NIT, CE, ...). Alegra CO responde
    // 2035 si se manda el número sin tipo.
    identificationObject: z
      .object({ type: z.string().min(1), number: z.string().min(1) })
      .strict()
      .optional(),
    identification: z.string().optional(),
    email: z.string().email().optional(),
    phonePrimary: z.string().optional(),
    address: alegraAddressSchema.optional(),
  })
  .strict();
export type AlegraContactPayload = z.infer<typeof alegraContactPayloadSchema>;

// ── Ítem de la factura ──────────────────────────────────────────────────────

export const alegraInvoiceItemSchema = z
  .object({
    // OBLIGATORIO: Alegra responde 3065 ("El id del ítem es obligatorio") sin él.
    id: z.number(),
    name: z.string().min(1).optional(),
    // Precio BASE (sin IVA): Becam manda con IVA incluido y se descuenta antes.
    price: z.number().nonnegative(),
    quantity: z.number().positive(),
    discount: z.number().min(0).max(100).optional(),
    tax: z.array(idRef).optional(),
  })
  .strict();
export type AlegraInvoiceItem = z.infer<typeof alegraInvoiceItemSchema>;

// ── Factura ───────────────────────────────────────────────────────────────────

export const alegraPaymentFormSchema = z.enum(["CASH", "CREDIT"]);

export const alegraInvoicePayloadSchema = z
  .object({
    client: z.number(), // Becam: id del contacto como número.
    date: yyyyMmDd,
    dueDate: yyyyMmDd,
    status: z.enum(["open", "draft"]).optional(),
    resolution: idRef.optional(),
    costCenter: idRef.optional(),
    warehouse: idRef.optional(),
    seller: idRef.optional(),
    // Colombia (obligatorios en esta cuenta). Con CASH, paymentMethod = "CASH".
    paymentForm: alegraPaymentFormSchema,
    paymentMethod: z.string().optional(),
    observations: z.string().max(500).optional(),
    anotation: z.string().max(500).optional(),
    // Emisión electrónica DIAN (solo cuando "Factura electrónica" está ON).
    stamp: z.object({ generateStamp: z.boolean() }).strict().optional(),
    items: z.array(alegraInvoiceItemSchema).min(1),
  })
  .strict();
export type AlegraInvoicePayload = z.infer<typeof alegraInvoicePayloadSchema>;

// ── Pago ────────────────────────────────────────────────────────────────────

export const alegraPaymentPayloadSchema = z
  .object({
    date: yyyyMmDd,
    bankAccount: z.number(),
    client: z.number(),
    amount: z.number().positive(),
    // En /payments el método va en MINÚSCULA (distinto de la factura).
    paymentMethod: z.enum(["transfer", "cash", "deposit", "check", "credit-card", "debit-card"]),
    invoices: z
      .array(z.object({ id: z.number(), amount: z.number().positive() }).strict())
      .min(1),
    observations: z.string().optional(),
    // Alegra solo acepta "in" (ingreso) u "out" (egreso).
    type: z.enum(["in", "out"]),
  })
  .strict();
export type AlegraPaymentPayload = z.infer<typeof alegraPaymentPayloadSchema>;

/**
 * Valida un payload contra su schema SIN lanzar. Devuelve la lista de problemas
 * (vacía si todo bien) para registrarlos como advertencia antes de llamar a
 * Alegra. No bloquea el flujo (defensa en profundidad, no puerta dura).
 */
export function validateAlegraPayload(
  schema: z.ZodTypeAny,
  payload: unknown
): string[] {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return [];
  return parsed.error.issues.map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`);
}
