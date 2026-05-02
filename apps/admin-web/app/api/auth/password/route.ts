import { NextResponse } from "next/server";

import { updatePassword } from "../../../../../../src/services/auth.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteUser } from "../../../../lib/route-auth";

export const POST = routeHandler(async (req: Request) => {
  const body = (await req.json()) as Record<string, unknown>;
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  const user = await requireRouteUser();
  try {
    const result = await updatePassword(user.id, currentPassword, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.message || "No se pudo actualizar" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
