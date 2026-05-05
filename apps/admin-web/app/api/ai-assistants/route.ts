import { NextResponse } from "next/server";

import { createAiAssistant, listAiAssistants } from "../../../../../src/services/ai-assistants.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  try {
    const assistants = await listAiAssistants();
    return NextResponse.json({ ok: true, data: assistants });
  } catch {
    return NextResponse.json({ ok: false, error: "Error al obtener asistentes" }, { status: 500 });
  }
});

export const POST = routeHandler(async (req: Request) => {
  await requireRouteAdmin();
  try {
    const payload = (await req.json()) as Record<string, unknown>;
    const assistant = await createAiAssistant(payload);
    return NextResponse.json({ ok: true, data: assistant });
  } catch {
    return NextResponse.json({ ok: false, error: "Error al crear asistente" }, { status: 500 });
  }
});
