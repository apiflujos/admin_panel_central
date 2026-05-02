import { NextResponse } from "next/server";

import { updateProfile } from "../../../../../src/services/users.service";
import { routeHandler } from "../../../lib/route-handler";
import { requireRouteUser } from "../../../lib/route-auth";

export const GET = routeHandler(async () => {
  const user = await requireRouteUser();
  return NextResponse.json({
    user: {
      id: user.id,
      organizationId: user.organization_id,
      email: user.email,
      role: user.role,
      isSuperAdmin: Boolean(user.is_super_admin),
      name: user.name,
      phone: user.phone,
      photoBase64: user.photo_base64,
    },
  });
});

export const PUT = routeHandler(async (req: Request) => {
  const user = await requireRouteUser();
  try {
    const updated = await updateProfile(user.id, (await req.json()) as Record<string, unknown>);
    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
