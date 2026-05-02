import { NextResponse } from "next/server";

import { createUser, listUsers } from "../../../../../src/services/users.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteAdmin } from "../../../lib/route-auth";

function isSuperAdminUser(user: Awaited<ReturnType<typeof requireRouteAdmin>>) {
  return Boolean(user && user.role === "super_admin" && user.is_super_admin);
}

export const GET = routeHandler(async () => {
  await requireRouteAdmin();
  try {
    const users = await listUsers();
    return NextResponse.json({ items: users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const POST = routeHandler(async (req: Request) => {
  const user = await requireRouteAdmin();
  try {
    const payload = { ...((await req.json()) as Record<string, unknown>) };
    if (!isSuperAdminUser(user) && Object.prototype.hasOwnProperty.call(payload, "role")) {
      if (payload.role) {
        return new NextResponse("Solo super admin puede asignar roles.", { status: 403 });
      }
      delete payload.role;
    }
    const created = await createUser(payload);
    return NextResponse.json({ ok: true, user: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
