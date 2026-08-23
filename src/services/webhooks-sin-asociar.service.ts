/**
 * Lo que recibimos y no pudimos asociar a nada.
 *
 * Escuchar un webhook es un compromiso: si nos suscribimos, no podemos
 * recibirlo y actuar como si no hubiera llegado. Cuando no sabemos a quién
 * pertenece, o el cuerpo viene ilegible, el evento se registra AQUÍ con su
 * motivo, se lista y se explica en la pantalla, para que una persona lo
 * gestione.
 *
 * Regla de oro de este módulo: registrar NUNCA puede tumbar la recepción. Si
 * esta escritura falla, se traga el error y se responde igual — perder el
 * registro es malo, pero rechazar el webhook y que el proveedor lo reintente o
 * desactive la suscripción es peor.
 */
import { z } from "zod";

import { getPool } from "../db";

/** Motivos cerrados: si aparece uno nuevo hay que declararlo y explicarlo. */
export const MOTIVOS_SIN_ASOCIAR = [
  "tienda_desconocida",
  "tienda_eliminada",
  "cuenta_desconocida",
  "cuerpo_ilegible",
  "firma_invalida",
] as const;

export type MotivoSinAsociar = (typeof MOTIVOS_SIN_ASOCIAR)[number];

/** Qué significa y qué hay que hacer. Es lo que se muestra en la pantalla. */
export const EXPLICACION_MOTIVO: Record<MotivoSinAsociar, { titulo: string; queSignifica: string; queHacer: string }> =
  {
    tienda_desconocida: {
      titulo: "Llega de una tienda que no tenemos registrada",
      queSignifica:
        "Shopify nos manda eventos de una tienda que no está conectada en la plataforma. El evento es real y se está perdiendo.",
      queHacer:
        "Conectar esa tienda en Conexiones, o quitar la suscripción del webhook en la tienda si ya no debe enviarnos nada.",
    },
    tienda_eliminada: {
      titulo: "La tienda existía y ya no está",
      queSignifica: "La conexión de esa tienda se borró, pero la tienda sigue enviándonos eventos.",
      queHacer: "Volver a conectarla si sigue operando, o desinstalar la app en esa tienda para que deje de enviar.",
    },
    cuenta_desconocida: {
      titulo: "Llega de una cuenta de Alegra que no reconocemos",
      queSignifica:
        "El evento no trae una cuenta de Alegra que podamos resolver, o esa cuenta no está asociada a ninguna tienda.",
      queHacer:
        "Comprobar que la cuenta de Alegra está conectada y que el webhook incluye el accountId. Si no lo incluye, la suscripción debe llevar ?shopDomain= en la URL.",
    },
    cuerpo_ilegible: {
      titulo: "El cuerpo del evento no se pudo leer",
      queSignifica:
        "La firma era válida, así que el evento es legítimo, pero el contenido no es JSON válido y no se puede procesar.",
      queHacer: "Avisar al proveedor. El cuerpo original queda guardado aquí para poder reclamarlo.",
    },
    firma_invalida: {
      titulo: "Firma inválida",
      queSignifica:
        "Alguien está llamando al endpoint sin la firma correcta. Puede ser tráfico ajeno, o puede ser que el secreto del webhook cambió y ahora rechazamos eventos legítimos.",
      queHacer:
        "Si el volumen sube de golpe, revisar el secreto del webhook: un secreto desincronizado hace que rechacemos eventos reales.",
    },
  };

const registroSchema = z.object({
  organizationId: z.number().int().positive().nullable().default(null),
  source: z.enum(["shopify", "alegra"]),
  eventType: z.string().default(""),
  shopDomain: z.string().default(""),
  accountId: z.string().default(""),
  motivo: z.enum(MOTIVOS_SIN_ASOCIAR),
  detalle: z.string().nullable().default(null),
  payload: z.unknown().nullable().default(null),
});

export type RegistroSinAsociar = z.input<typeof registroSchema>;

/**
 * Deja constancia de un webhook que no se pudo asociar.
 *
 * Los repetidos se agregan: un mismo problema es UNA fila con su contador. Una
 * tienda mal configurada puede mandar miles de eventos y lo que importa es el
 * hecho, no mil copias.
 */
export async function registrarWebhookSinAsociar(entrada: RegistroSinAsociar) {
  const parsed = registroSchema.safeParse(entrada);
  if (!parsed.success) {
    console.error("[webhook][sin-asociar] registro inválido:", parsed.error.issues[0]?.message);
    return;
  }
  const d = parsed.data;
  // Nunca se guarda el cuerpo de una petición con firma inválida: ese endpoint
  // lo puede llamar cualquiera y sería una vía para llenarnos el disco.
  const payload = d.motivo === "firma_invalida" ? null : d.payload;

  try {
    await getPool().query(
      `
      INSERT INTO webhooks_sin_asociar
        (organization_id, source, event_type, shop_domain, account_id, motivo, detalle, payload_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT (source, motivo, shop_domain, account_id, event_type)
      DO UPDATE SET veces = webhooks_sin_asociar.veces + 1,
                    ultima_vez = NOW(),
                    detalle = COALESCE(EXCLUDED.detalle, webhooks_sin_asociar.detalle),
                    payload_json = COALESCE(EXCLUDED.payload_json, webhooks_sin_asociar.payload_json),
                    -- Si vuelve a ocurrir, deja de estar atendido: es un
                    -- problema vivo otra vez, no historia.
                    atendido_at = NULL
      `,
      [
        d.organizationId,
        d.source,
        d.eventType,
        d.shopDomain,
        d.accountId,
        d.motivo,
        d.detalle,
        payload === null || payload === undefined ? null : JSON.stringify(payload),
      ]
    );
  } catch (error) {
    // Registrar no puede tumbar la recepción: mejor perder la constancia que
    // rechazar el webhook y que el proveedor desactive la suscripción.
    console.error(
      `[webhook][sin-asociar] no se pudo registrar (${d.source}/${d.motivo}):`,
      error instanceof Error ? error.message : error
    );
  }
}

export type WebhookSinAsociar = {
  id: number;
  source: string;
  eventType: string;
  shopDomain: string;
  accountId: string;
  motivo: MotivoSinAsociar;
  detalle: string | null;
  veces: number;
  primeraVez: string;
  ultimaVez: string;
  atendido: boolean;
  titulo: string;
  queSignifica: string;
  queHacer: string;
};

const FALLBACK_EXPLICACION = {
  titulo: "Motivo desconocido",
  queSignifica: "El evento se registró con un motivo que esta versión de la aplicación no conoce.",
  queHacer: "Revisar el registro y actualizar la aplicación.",
};

/**
 * Alcance de lectura.
 *
 * Sin `organizationId` se ve TODO: es la vista de Super Admin, y hace falta
 * porque el caso más importante —una tienda que no reconocemos— no tiene
 * organización por definición y de otro modo no lo vería nadie.
 *
 * Con `organizationId` se ve lo de esa organización MÁS lo que llega de sus
 * propios dominios aunque no se haya podido atribuir.
 */
export type AlcanceSinAsociar = { organizationId?: number | null };

const filtroAlcance = (n: number) => `
  ($${n}::int IS NULL
   OR organization_id = $${n}::int
   OR shop_domain IN (SELECT shop_domain FROM shopify_stores WHERE organization_id = $${n}::int))`;

/** Lista lo no asociado, lo no atendido primero. */
export async function listarWebhooksSinAsociar(
  opciones: { incluirAtendidos?: boolean; limite?: number } & AlcanceSinAsociar = {}
) {
  const limite = Math.min(Math.max(Number(opciones.limite) || 100, 1), 500);
  const { rows } = await getPool().query<{
    id: number;
    source: string;
    event_type: string;
    shop_domain: string;
    account_id: string;
    motivo: string;
    detalle: string | null;
    veces: number;
    primera_vez: Date;
    ultima_vez: Date;
    atendido_at: Date | null;
  }>(
    `
    SELECT id, source, event_type, shop_domain, account_id, motivo, detalle, veces,
           primera_vez, ultima_vez, atendido_at
    FROM webhooks_sin_asociar
    WHERE ($1::boolean OR atendido_at IS NULL)
      AND ${filtroAlcance(3)}
    ORDER BY (atendido_at IS NULL) DESC, ultima_vez DESC
    LIMIT $2
    `,
    [Boolean(opciones.incluirAtendidos), limite, opciones.organizationId ?? null]
  );

  return rows.map((row): WebhookSinAsociar => {
    const motivo = row.motivo as MotivoSinAsociar;
    const explicacion = EXPLICACION_MOTIVO[motivo] || FALLBACK_EXPLICACION;
    return {
      id: Number(row.id),
      source: String(row.source),
      eventType: String(row.event_type || ""),
      shopDomain: String(row.shop_domain || ""),
      accountId: String(row.account_id || ""),
      motivo,
      detalle: row.detalle ? String(row.detalle) : null,
      veces: Number(row.veces || 1),
      primeraVez: new Date(row.primera_vez).toISOString(),
      ultimaVez: new Date(row.ultima_vez).toISOString(),
      atendido: Boolean(row.atendido_at),
      ...explicacion,
    };
  });
}

/**
 * Cuántos problemas vivos hay. Es lo que enciende el aviso en la pantalla.
 * `eventos` cuenta los webhooks perdidos; `problemas`, los casos distintos.
 */
export async function resumenWebhooksSinAsociar(alcance: AlcanceSinAsociar = {}) {
  const { rows } = await getPool().query<{ problemas: number; eventos: number; ultima_vez: Date | null }>(
    `
    SELECT count(*)::int AS problemas,
           COALESCE(sum(veces), 0)::int AS eventos,
           max(ultima_vez) AS ultima_vez
    FROM webhooks_sin_asociar
    WHERE atendido_at IS NULL
      AND ${filtroAlcance(1)}
    `,
    [alcance.organizationId ?? null]
  );
  const row = rows[0] || {};
  return {
    problemas: Number(row.problemas || 0),
    eventos: Number(row.eventos || 0),
    ultimaVez: row.ultima_vez ? new Date(row.ultima_vez).toISOString() : null,
  };
}

/** Una persona lo revisó. Si el problema reaparece, vuelve a salir solo. */
export async function marcarWebhookAtendido(id: number, usuarioId: number | null, notas?: string | null) {
  const idValido = z.number().int().positive().safeParse(id);
  if (!idValido.success) throw new Error("Identificador de webhook inválido");
  await getPool().query(
    `
    UPDATE webhooks_sin_asociar
       SET atendido_at = NOW(), atendido_por = $2, notas = COALESCE($3, notas)
     WHERE id = $1
    `,
    [idValido.data, usuarioId, notas ?? null]
  );
}
