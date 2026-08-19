import { z } from "zod";

/**
 * Validación de FORMATO de las variables de entorno con Zod.
 *
 * Complementa `assertStartupEnv` (utils/env-check.ts), que valida PRESENCIA y
 * hace fail-fast de lo crítico. Aquí validamos que lo que SÍ está presente tenga
 * el formato correcto (base64 de la clave AES, postgres://, emails, URLs), para
 * detectar mala configuración sutil al arranque en vez de fallar en runtime.
 * Devuelve advertencias — no lanza (la presencia ya la maneja env-check).
 */
const EnvFormatSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//i, "debe ser una URL postgres://")
    .optional(),
  // Clave de cifrado de credenciales (AES). base64 válido de ≥16 bytes.
  CRYPTO_KEY_BASE64: z
    .string()
    .refine((v) => {
      try {
        return Buffer.from(v, "base64").length >= 16;
      } catch {
        return false;
      }
    }, "debe ser base64 válido de ≥16 bytes (clave AES)")
    .optional(),
  REDIS_URL: z.string().url("debe ser una URL válida").optional(),
  ALEGRA_EMAIL: z.string().email("debe ser un email válido").optional(),
  APP_HOST: z.string().url("debe ser una URL válida (https://...)").optional(),
  APP_ORG_ID: z.coerce.number().int().positive("debe ser un entero positivo").optional(),
});

export type EnvFormat = z.infer<typeof EnvFormatSchema>;

/**
 * Valida el FORMATO de las env presentes. No lanza; devuelve la lista de
 * problemas de formato (vacía si todo bien) para que el llamador los registre.
 */
export function validateEnvFormats(): string[] {
  const present: Record<string, string> = {};
  for (const key of Object.keys(EnvFormatSchema.shape)) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      present[key] = raw.trim();
    }
  }
  const parsed = EnvFormatSchema.safeParse(present);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}
