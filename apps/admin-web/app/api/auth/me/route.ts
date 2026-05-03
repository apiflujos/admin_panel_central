import { NextResponse } from "next/server";

import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteUser } from "../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  const user = await requireRouteUser();
  return NextResponse.json({
    ok: true,
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
