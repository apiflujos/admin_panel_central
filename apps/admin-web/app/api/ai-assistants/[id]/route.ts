import { NextResponse } from "next/server";

import { deleteAiAssistant, updateAiAssistant } from "../../../../../../src/services/ai-assistants.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const PUT = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  try {
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const id = Number(params.id || "");
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }
    const payload = (await req.json()) as Record<string, unknown>;
    const assistant = await updateAiAssistant(id, payload);
    return NextResponse.json({ ok: true, data: assistant });
  } catch {
    return NextResponse.json({ ok: false, error: "Error al actualizar asistente" }, { status: 500 });
  }
});

export const DELETE = routeHandler(async (_req: Request, ctx) => {
  await requireRouteAdmin();
  try {
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const id = Number(params.id || "");
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }
    const result = await deleteAiAssistant(id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "Error al eliminar asistente" }, { status: 500 });
  }
});
