#!/usr/bin/env node
"use strict";

const DEFAULT_BASE_URL = "http://localhost:10000";

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

function normalizeShopDomain(value) {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function formatResult(ok) {
  return ok ? "OK" : "FAIL";
}

function getSetCookieHeaders(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie().filter(Boolean);
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

async function httpJson(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  let payload = null;
  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => "");
    payload = text ? { text } : null;
  }
  return { response, payload };
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.BASE_URL || process.argv[2] || DEFAULT_BASE_URL);
  const qaToken = String(process.env.QA_TOKEN || "").trim();
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");
  const explicitShopDomain = normalizeShopDomain(process.env.SHOP_DOMAIN || "");

  const results = [];
  const record = (name, ok, details = "") => {
    results.push({ name, ok, details });
    const suffix = details ? ` — ${details}` : "";
    console.log(`${formatResult(ok)}  ${name}${suffix}`);
  };

  record("BASE_URL", true, baseUrl);

  // Public checks
  {
    const { response, payload } = await httpJson(baseUrl, "/health");
    const ok = response.ok && payload && payload.status === "ok";
    record("GET /health", ok, ok ? "" : `status=${response.status}`);
  }

  {
    const { response } = await httpJson(baseUrl, "/api/company/public");
    record("GET /api/company/public", response.ok, response.ok ? "" : `status=${response.status}`);
  }

  let authHeader = "";
  let cookieHeader = "";

  if (qaToken) {
    authHeader = `Bearer ${qaToken}`;
    record("Auth (QA_TOKEN)", true);
  } else if (adminEmail && adminPassword) {
    const { response } = await httpJson(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword, remember: false }),
    });
    if (!response.ok) {
      record("POST /api/auth/login", false, `status=${response.status}`);
      process.exitCode = 1;
      return;
    }
    const cookies = getSetCookieHeaders(response.headers);
    cookieHeader = cookies
      .map((cookie) => String(cookie).split(";")[0])
      .filter(Boolean)
      .join("; ");
    record("POST /api/auth/login", Boolean(cookieHeader), cookieHeader ? "cookie recibido" : "sin cookie");
  } else {
    record("Auth", false, "Define QA_TOKEN o ADMIN_EMAIL/ADMIN_PASSWORD para checks privados.");
    process.exitCode = 1;
    return;
  }

  const buildAuthHeaders = () => {
    const headers = {};
    if (authHeader) headers.Authorization = authHeader;
    if (cookieHeader) headers.Cookie = cookieHeader;
    return headers;
  };

  // Authenticated checks
  {
    const { response, payload } = await httpJson(baseUrl, "/api/profile", { headers: buildAuthHeaders() });
    const ok = response.ok && payload && payload.user && payload.user.email;
    record("GET /api/profile", ok, ok ? payload.user.email : `status=${response.status}`);
  }

  {
    const { response, payload } = await httpJson(baseUrl, "/api/settings", { headers: buildAuthHeaders() });
    const ok = response.ok && payload && typeof payload === "object";
    record("GET /api/settings (admin)", ok, ok ? "" : `status=${response.status}`);
  }

  let shopDomain = explicitShopDomain;
  {
    const { response, payload } = await httpJson(baseUrl, "/api/connections", { headers: buildAuthHeaders() });
    const stores = payload && Array.isArray(payload.stores) ? payload.stores : [];
    const ok = response.ok && Array.isArray(stores);
    record("GET /api/connections (admin)", ok, ok ? `${stores.length} tiendas` : `status=${response.status}`);
    if (!shopDomain && stores.length) {
      shopDomain = normalizeShopDomain(stores[0]?.shopDomain || "");
    }
  }

  {
    const { response, payload } = await httpJson(baseUrl, "/api/store-configs", { headers: buildAuthHeaders() });
    const ok = response.ok && payload && Array.isArray(payload.items);
    record("GET /api/store-configs (admin)", ok, ok ? `${payload.items.length} configs` : `status=${response.status}`);
  }

  if (shopDomain) {
    const { response, payload } = await httpJson(
      baseUrl,
      `/api/shopify/webhooks/status?shopDomain=${encodeURIComponent(shopDomain)}`,
      { headers: buildAuthHeaders() }
    );
    const ok = response.ok && payload && typeof payload.total === "number";
    const detail = ok ? `connected=${payload.connected}/${payload.total}` : `status=${response.status}`;
    record("GET /api/shopify/webhooks/status (admin)", ok, detail);
  } else {
    record("GET /api/shopify/webhooks/status (admin)", false, "Define SHOP_DOMAIN o crea una tienda primero.");
  }

  {
    const { response, payload } = await httpJson(baseUrl, "/api/checkpoints/inventory-adjustments", { headers: buildAuthHeaders() });
    const ok = response.ok && payload && typeof payload.intervalMs === "number";
    record("GET /api/checkpoints/inventory-adjustments", ok, ok ? `intervalMs=${payload.intervalMs}` : `status=${response.status}`);
  }

  {
    const { response } = await httpJson(baseUrl, "/api/metrics", { headers: buildAuthHeaders() });
    record("GET /api/metrics", response.ok, response.ok ? "" : `status=${response.status}`);
  }

  const failed = results.filter((item) => !item.ok);
  console.log("");
  if (!failed.length) {
    console.log("Smoke test OK.");
    return;
  }
  console.log(`Smoke test FAIL (${failed.length}).`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

