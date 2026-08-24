import { NextResponse } from "next/server";

import { ensureInvoiceSettingsColumns, getOrgId, getPool } from "../../../../../../../src/db";
import {
  getOrderInvoiceOverride,
  upsertOrderInvoiceOverride,
} from "../../../../../../../src/services/order-invoice-overrides.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "No disponible");

const parseBooleanLike = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return Boolean(value);
};

const asOptionalString = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
};

export const GET = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  try {
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const orderId = String(params.orderId || "");
    const shopDomain = new URL(req.url).searchParams.get("shopDomain")?.trim() || "";
    const override = await getOrderInvoiceOverride(orderId, shopDomain);
    const pool = getPool();
    const orgId = getOrgId();
    await ensureInvoiceSettingsColumns(pool);
    const result = await pool.query<{ einvoice_enabled: boolean | null }>(
      `
      SELECT einvoice_enabled
      FROM invoice_settings
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orgId]
    );
    const einvoiceEnabled = Boolean(result.rows[0]?.einvoice_enabled);
    return NextResponse.json({ override, einvoiceEnabled });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const PUT = routeHandler(async (req: Request, ctx) => {
  await requireRouteAdmin();
  try {
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const orderId = String(params.orderId || "");
    const shopDomain = new URL(req.url).searchParams.get("shopDomain")?.trim() || "";
    const payload = (await req.json()) as Record<string, unknown>;
    const result = await upsertOrderInvoiceOverride(
      orderId,
      {
        orderId,
        shopDomain,
        einvoiceRequested: parseBooleanLike(payload.einvoiceRequested),
        idType: asOptionalString(payload.idType),
        idNumber: asOptionalString(payload.idNumber),
        fiscalName: asOptionalString(payload.fiscalName),
        email: asOptionalString(payload.email),
        phone: asOptionalString(payload.phone),
        address: asOptionalString(payload.address),
        city: asOptionalString(payload.city),
        state: asOptionalString(payload.state),
        country: asOptionalString(payload.country),
        zip: asOptionalString(payload.zip),
      },
      shopDomain
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
