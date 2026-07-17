#!/usr/bin/env node
"use strict";

/*
 * Integration test for the Shopify/Alegra action endpoints exposed in the
 * admin panel:
 *   - Bulk publish products to Shopify   POST /api/sync/products
 *   - Publish one product to Shopify     POST /api/shopify/publish
 *   - Invoice one order (facturar)       POST /api/operations/:id/invoice
 *
 * It verifies the full request wiring (auth session + CSRF + routing + handler)
 * without requiring a live Shopify connection: a request that reaches the
 * handler and fails on business rules (e.g. "Missing Shopify credentials") still
 * proves the integration path is functional. A CSRF-less request MUST be
 * rejected with 403, which the test asserts explicitly.
 *
 * Usage:
 *   BASE_URL=http://localhost:3006 node scripts/qa-integration-actions.js
 * Credentials are read from ADMIN_EMAIL / ADMIN_PASSWORD (loaded from .env).
 */

// Capture an explicitly-provided BASE_URL before dotenv loads .env, so a stale
// BASE_URL in .env (e.g. an ngrok tunnel used by other smoke tests) never
// overrides the local target of this integration test.
const explicitBaseUrl = process.env.BASE_URL;
require("dotenv").config();

const DEFAULT_BASE_URL = "http://localhost:3006";

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

function getSetCookieHeaders(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie().filter(Boolean);
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

async function httpRequest(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, { redirect: "manual", ...options });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");
  return { response, body };
}

async function main() {
  const baseUrl = normalizeBaseUrl(explicitBaseUrl || process.argv[2] || DEFAULT_BASE_URL);
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  const results = [];
  const record = (name, ok, details = "") => {
    results.push({ name, ok });
    console.log(`${ok ? "OK  " : "FAIL"}  ${name}${details ? ` — ${details}` : ""}`);
  };

  record("BASE_URL", true, baseUrl);

  // 1. Health
  {
    const { response, body } = await httpRequest(baseUrl, "/health");
    record("GET /health", response.ok && body && body.status === "ok", `status=${response.status}`);
  }

  if (!adminEmail || !adminPassword) {
    record("Auth", false, "Define ADMIN_EMAIL y ADMIN_PASSWORD (.env) para el test.");
    process.exitCode = 1;
    return;
  }

  // 2. Login (JSON) -> session cookie
  let cookieHeader = "";
  {
    const { response } = await httpRequest(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    cookieHeader = getSetCookieHeaders(response.headers)
      .map((cookie) => String(cookie).split(";")[0])
      .filter(Boolean)
      .join("; ");
    const ok = response.ok && Boolean(cookieHeader);
    record("POST /api/auth/login", ok, ok ? "cookie recibida" : `status=${response.status}`);
    if (!ok) {
      process.exitCode = 1;
      return;
    }
  }

  // 3. CSRF token
  let csrfToken = "";
  {
    const { response, body } = await httpRequest(baseUrl, "/api/auth/csrf", {
      headers: { Cookie: cookieHeader },
    });
    csrfToken = body && typeof body.token === "string" ? body.token : "";
    record("GET /api/auth/csrf", response.ok && Boolean(csrfToken), `status=${response.status}`);
    if (!csrfToken) {
      process.exitCode = 1;
      return;
    }
  }

  const authHeaders = (withCsrf) => ({
    Cookie: cookieHeader,
    "Content-Type": "application/json",
    ...(withCsrf ? { "x-csrf-token": csrfToken } : {}),
  });

  // 4. CSRF is ENFORCED: a mutating request without the token must be rejected.
  {
    const { response, body } = await httpRequest(baseUrl, "/api/shopify/publish", {
      method: "POST",
      headers: authHeaders(false),
      body: JSON.stringify({ alegraId: "1" }),
    });
    const ok = response.status === 403 && body && body.error === "csrf_invalid";
    record("CSRF enforced (publish sin token -> 403)", ok, `status=${response.status}`);
  }

  // Helper: a request "reaches the handler" if it is NOT blocked by auth/CSRF.
  const reachedHandler = (response, body) =>
    response.status !== 401 &&
    response.status !== 403 &&
    !(body && (body.error === "csrf_invalid" || body.error === "unauthorized"));

  // 5. Publish one-by-one to Shopify -> handler reached (200 or business error).
  {
    const { response, body } = await httpRequest(baseUrl, "/api/shopify/publish", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ alegraId: "1" }),
    });
    record(
      "POST /api/shopify/publish (uno a uno)",
      reachedHandler(response, body),
      `status=${response.status}${body && body.error ? ` err="${body.error}"` : ""}`
    );
  }

  // 6. Bulk publish products to Shopify -> handler reached.
  {
    const { response, body } = await httpRequest(baseUrl, "/api/sync/products", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({}),
    });
    record(
      "POST /api/sync/products (masivo)",
      reachedHandler(response, body),
      `status=${response.status}${body && body.error ? ` err="${body.error}"` : ""}`
    );
  }

  // 7. Invoice one order (facturar) -> handler reached (nonexistent id -> 400).
  {
    const { response, body } = await httpRequest(baseUrl, "/api/operations/999999/invoice", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({}),
    });
    record(
      "POST /api/operations/:id/invoice (facturar)",
      reachedHandler(response, body),
      `status=${response.status}${body && body.error ? ` err="${body.error}"` : ""}`
    );
  }

  const failed = results.filter((item) => !item.ok);
  console.log("");
  if (!failed.length) {
    console.log("Integration actions test OK.");
    return;
  }
  console.log(`Integration actions test FAIL (${failed.length}).`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
