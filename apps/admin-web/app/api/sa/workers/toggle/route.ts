import { NextResponse } from "next/server";
import { z } from "zod";

import { WORKER_KEYS } from "../../../../../../../packages/shared/src/workers";
import { setWorkerEnabled } from "../../../../../../../src/services/worker-settings.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../../lib/route-auth";

function parseBooleanLike(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on", "si", "sí"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return value;
}

const schema = z.object({
  // z.enum sobre el catálogo: una clave que no exista se rechaza aquí, antes de
  // llegar a la base.
  workerKey: z.enum(WORKER_KEYS),
  enabled: z.preprocess(parseBooleanLike, z.boolean()),
});

export const POST = routeHandler(async (req: Request) => {
  const session = await requireRouteSuperAdmin();
  try {
    const body = schema.parse((await req.json()) as Record<string, unknown>);
    // Queda registrado QUIÉN encendió o apagó: es la traza que faltaba cuando
    // hubo que averiguar por qué corrió una sincronización.
    const result = await setWorkerEnabled(body.workerKey, body.enabled, session.email);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
  }
});
