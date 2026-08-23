import { z } from "zod";

export const priceSnapshotSchema = z.object({
  priceWithVat: z.number().finite().min(0),
  discountPriceWithVat: z.number().finite().min(0),
  general: z.number().finite().min(0),
  discountBeforeVat: z.number().finite().min(0),
});

export const desiredPricingSchema = z.object({
  price: z
    .string()
    .regex(/^\d+\.\d{2}$/)
    .nullable(),
  compareAtPrice: z
    .string()
    .regex(/^\d+\.\d{2}$/)
    .nullable(),
  strategy: z.enum(["no_price", "base_price", "discount_active"]),
});

export type PriceSnapshot = z.infer<typeof priceSnapshotSchema>;
export type DesiredPricing = z.infer<typeof desiredPricingSchema>;
