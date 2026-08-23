/**
 * «Lo que recibimos y no pudimos procesar», para la pantalla.
 *
 * Escuchar un webhook es un compromiso. Cuando no se puede asociar a nada, el
 * evento queda registrado con su motivo y estas rutas lo sacan a la luz para
 * que una persona lo gestione, en vez de que se pierda en un `console.warn`.
 */
import type { Request, Response } from "express";
import { z } from "zod";

import { getOrgId } from "../db";
import {
  listarWebhooksSinAsociar,
  marcarWebhookAtendido,
  resumenWebhooksSinAsociar,
} from "../services/webhooks-sin-asociar.service";

const consultaSchema = z.object({
  incluirAtendidos: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  limite: z.coerce.number().int().positive().max(500).optional(),
});

/** Vista de la empresa: lo suyo y lo que llega de sus dominios. */
export async function listarWebhooksSinAsociarHandler(req: Request, res: Response) {
  const q = consultaSchema.parse(req.query || {});
  const organizationId = getOrgId();
  const [items, resumen] = await Promise.all([
    listarWebhooksSinAsociar({ ...q, organizationId }),
    resumenWebhooksSinAsociar({ organizationId }),
  ]);
  res.status(200).json({ items, resumen });
}

/**
 * Vista de Super Admin: TODO, sin filtrar por organización.
 *
 * Hace falta que exista: el caso más importante —un webhook de una tienda que
 * no reconocemos— no tiene organización por definición, así que si sólo
 * existiera la vista por empresa no lo vería nadie.
 */
export async function saListarWebhooksSinAsociarHandler(req: Request, res: Response) {
  const q = consultaSchema.parse(req.query || {});
  const [items, resumen] = await Promise.all([listarWebhooksSinAsociar(q), resumenWebhooksSinAsociar()]);
  res.status(200).json({ items, resumen });
}

const atenderSchema = z.object({
  id: z.coerce.number().int().positive(),
  notas: z.string().max(2000).optional(),
});

/**
 * Marca un caso como revisado. No lo borra: si el problema vuelve a ocurrir, el
 * registro se reactiva solo, porque entonces es un problema vivo otra vez.
 */
export async function atenderWebhookSinAsociarHandler(req: Request, res: Response) {
  const parsed = atenderSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Datos inválidos" });
  }
  const usuarioId = (req as Request & { user?: { id?: number } }).user?.id ?? null;
  await marcarWebhookAtendido(parsed.data.id, usuarioId, parsed.data.notas ?? null);
  return res.status(200).json({ ok: true });
}
