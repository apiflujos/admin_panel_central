import { NextResponse } from "next/server";

import { deleteUser, updateUser } from "../../../../../../src/services/users.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

function isSuperAdminUser(user: Awaited<ReturnType<typeof requireRouteAdmin>>) {
  return Boolean(user && user.role === "super_admin" && user.is_super_admin);
}

export const PUT = routeHandler(async (req: Request, ctx) => {
  const user = await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const userId = String(params.userId || "");
  try {
    const payload = { ...((await req.json()) as Record<string, unknown>) };
    if (!isSuperAdminUser(user) && Object.prototype.hasOwnProperty.call(payload, "role")) {
      return new NextResponse("Solo super admin puede cambiar roles.", { status: 403 });
    }
    const updated = await updateUser(Number(userId), payload);
    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const DELETE = routeHandler(async (_req: Request, ctx) => {
  const user = await requireRouteAdmin();
  const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
  const userId = String(params.userId || "");
  try {
    await deleteUser(Number(userId), user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
