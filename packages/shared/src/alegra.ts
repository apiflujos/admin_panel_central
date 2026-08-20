import { z } from "zod";

export const alegraWarehouseInventorySchema = z.object({
  id: z.union([z.string(), z.number()]),
  availableQuantity: z.number().finite().optional(),
  /**
   * Cantidad mínima que Alegra mantiene reservada en la bodega. Llega como
   * cadena en la respuesta del API (p. ej. `"100"`), de ahí la unión de tipos.
   */
  minQuantity: z.union([z.string(), z.number()]).optional(),
});

export const alegraInventorySchema = z.object({
  availableQuantity: z.number().finite().optional(),
  warehouses: z.array(alegraWarehouseInventorySchema).optional(),
});

export const alegraCustomFieldSchema = z.object({
  name: z.string().optional(),
  label: z.string().optional(),
  value: z.string().optional(),
});

export const alegraItemIdentifierSchema = z.object({
  code: z.string().optional(),
  reference: z.string().optional(),
  barcode: z.string().optional(),
  customFields: z.array(alegraCustomFieldSchema).optional(),
  status: z.string().optional(),
  inventory: alegraInventorySchema.optional(),
});

export type AlegraWarehouseInventory = z.infer<typeof alegraWarehouseInventorySchema>;
export type AlegraInventory = z.infer<typeof alegraInventorySchema>;
export type AlegraCustomField = z.infer<typeof alegraCustomFieldSchema>;
export type AlegraItemIdentifier = z.infer<typeof alegraItemIdentifierSchema>;
