import { NextResponse } from "next/server";

import { resolveShopDomainByPixelKey } from "../../../../../../src/marketing/db/marketing.repository";
import { routeHandler } from "../../../../lib/route-handler";

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

export const GET = routeHandler(async (req: Request) => {
  const access = await resolvePixelAccess(req);
  if (!access.ok) {
    return new NextResponse("unauthorized", {
      status: 401,
      headers: { "Content-Type": "text/plain" },
    });
  }
  const key = typeof new URL(req.url).searchParams.get("key") === "string" ? String(new URL(req.url).searchParams.get("key") || "") : "";
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
  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
