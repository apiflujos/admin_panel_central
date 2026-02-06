import type { Request, Response } from "express";
import { getOrgId, getPool } from "../db";
import { inferChannel, parseUtmFromUrl } from "../marketing/shopify/shopify-admin-api";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

function allowPixel(req: Request) {
  const required = String(process.env.MARKETING_PIXEL_KEY || "").trim();
  if (!required) return process.env.NODE_ENV !== "production";
  const provided = typeof req.query.key === "string" ? String(req.query.key) : "";
  return provided && provided === required;
}

export async function marketingPixelScriptHandler(req: Request, res: Response) {
  if (!allowPixel(req)) {
    res.status(401).type("text/plain").send("unauthorized");
    return;
  }
  const key = typeof req.query.key === "string" ? String(req.query.key) : "";
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  // Minimal enterprise pixel: session + add_to_cart.
  // Install in Shopify: theme.liquid (before </body>):
  // <script src="https://TU_APP/api/marketing/pixel.js?key=..."></script>
  const collectorUrl = `/api/marketing/collect?key=${encodeURIComponent(key)}`;
  const script = `
(function(){
  function getShopDomain(){
    try {
      if (window.Shopify && window.Shopify.shop) return String(window.Shopify.shop);
    } catch(e){}
    return "";
  }
  function post(payload){
    try{
      navigator.sendBeacon
        ? navigator.sendBeacon(${JSON.stringify(collectorUrl)}, new Blob([JSON.stringify(payload)], {type:"application/json"}))
        : fetch(${JSON.stringify(collectorUrl)}, {method:"POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload), keepalive:true});
    }catch(e){}
  }
  var shopDomain = getShopDomain();
  var landing = String(location.href || "");
  var ref = String(document.referrer || "");
  post({eventType:"session", shopDomain: shopDomain, landingSite: landing, referrer: ref, occurredAt: new Date().toISOString()});

  function onAddToCart(){
    post({eventType:"add_to_cart", shopDomain: shopDomain, landingSite: landing, referrer: ref, occurredAt: new Date().toISOString()});
  }

  document.addEventListener("submit", function(ev){
    try{
      var form = ev.target;
      if (!form || !form.action) return;
      var action = String(form.action || "");
      if (action.indexOf("/cart/add") !== -1) onAddToCart();
    }catch(e){}
  }, true);
})();
  `.trim();
  res.status(200).send(script);
}

export async function marketingCollectHandler(req: Request, res: Response) {
  if (!allowPixel(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const pool = getPool();
  const orgId = getOrgId();
  const body = (req.body || {}) as Record<string, unknown>;

  const shopDomain = normalizeShopDomain(body.shopDomain);
  const eventType = String(body.eventType || "").trim();
  const occurredAt = typeof body.occurredAt === "string" ? body.occurredAt : new Date().toISOString();
  const landingSite = typeof body.landingSite === "string" ? body.landingSite : "";
  const referrer = typeof body.referrer === "string" ? body.referrer : "";
  if (!shopDomain) {
    res.status(400).json({ error: "shopDomain requerido" });
    return;
  }
  if (!eventType) {
    res.status(400).json({ error: "eventType requerido" });
    return;
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

  res.status(200).json({ ok: true });
}
