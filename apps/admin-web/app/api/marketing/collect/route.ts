import { NextResponse } from "next/server";

import { getOrgId, getPool } from "../../../../../../src/db";
import { resolveShopDomainByPixelKey } from "../../../../../../src/marketing/db/marketing.repository";
import { inferChannel, parseUtmFromUrl } from "../../../../../../src/marketing/shopify/shopify-admin-api";
import { routeHandler } from "../../../../lib/route-handler";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

async function resolvePixelAccess(req: Request) {
  const provided = typeof new URL(req.url).searchParams.get("key") === "string" ? String(new URL(req.url).searchParams.get("key") || "") : "";
  const key = String(provided || "").trim();
  if (!key) {
    return { ok: process.env.NODE_ENV !== "production", scope: "none", shopDomain: "" };
  }
  const envKey = String(process.env.MARKETING_PIXEL_KEY || "").trim();
  if (envKey && key === envKey) {
    return { ok: true, scope: "env", shopDomain: "" };
  }
  const shopDomain = await resolveShopDomainByPixelKey(key);
  if (shopDomain) {
    return { ok: true, scope: "db", shopDomain };
  }
  return { ok: false, scope: "none", shopDomain: "" };
}

export const POST = routeHandler(async (req: Request) => {
  const access = await resolvePixelAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const pool = getPool();
  const orgId = getOrgId();
  const body = ((await req.json()) || {}) as Record<string, unknown>;

  const shopDomain = normalizeShopDomain(body.shopDomain);
  if (access.scope === "db" && access.shopDomain && shopDomain && shopDomain !== access.shopDomain) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const eventType = String(body.eventType || "").trim();
  const occurredAt = typeof body.occurredAt === "string" ? body.occurredAt : new Date().toISOString();
  const landingSite = typeof body.landingSite === "string" ? body.landingSite : "";
  const referrer = typeof body.referrer === "string" ? body.referrer : "";
  if (!shopDomain) {
    return NextResponse.json({ error: "shopDomain requerido" }, { status: 400 });
  }
  if (!eventType) {
    return NextResponse.json({ error: "eventType requerido" }, { status: 400 });
  }

  const utm = parseUtmFromUrl(landingSite);
  const channel = inferChannel({ utmSource: utm.utm_source, utmMedium: utm.utm_medium, referrer });
  const utmSource = utm.utm_source || "direct";
  const utmMedium = utm.utm_medium || "none";
  const utmCampaign = utm.utm_campaign || "";
  const utmContent = utm.utm_content || "";

  await pool.query(
    `
    INSERT INTO marketing.attribution_events
      (organization_id, shop_domain, event_type, occurred_at, landing_site, referrer, utm_source, utm_medium, utm_campaign, utm_content, inferred_channel, metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `,
    [
      orgId,
      shopDomain,
      eventType,
      occurredAt,
      landingSite || null,
      referrer || null,
      utm.utm_source,
      utm.utm_medium,
      utm.utm_campaign,
      utm.utm_content,
      channel,
      body,
    ]
  );

  await pool.query(
    `
    INSERT INTO marketing.traffic_sources (organization_id, shop_domain, utm_source, utm_medium, channel, updated_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
    ON CONFLICT (organization_id, shop_domain, utm_source, utm_medium)
    DO UPDATE SET channel = EXCLUDED.channel, updated_at = NOW()
    `,
    [orgId, shopDomain, utmSource, utmMedium, channel]
  );

  if (utmCampaign) {
    await pool.query(
      `
      INSERT INTO marketing.campaigns (organization_id, shop_domain, utm_source, utm_medium, utm_campaign, utm_content, name, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      ON CONFLICT (organization_id, shop_domain, utm_campaign, utm_source, utm_medium, utm_content)
      DO UPDATE SET updated_at = NOW()
      `,
      [orgId, shopDomain, utm.utm_source || "", utm.utm_medium || "", utmCampaign, utmContent, utmCampaign]
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
});
