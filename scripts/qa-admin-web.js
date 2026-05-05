#!/usr/bin/env node
"use strict";

const DEFAULT_BASE_URL = "http://localhost:3100";

const PAGE_CHECKS = [
  { path: "/", label: "Dashboard", marker: "Métricas" },
  { path: "/profile", label: "Perfil", marker: "Perfil" },
  { path: "/company", label: "Empresa", marker: "Empresa" },
  { path: "/users", label: "Usuarios", marker: "Usuarios" },
  { path: "/ai-assistants", label: "Asistentes IA", marker: "Asistentes IA" },
  { path: "/settings/connections", label: "Conexiones", marker: "Conexiones" },
  { path: "/settings/stores", label: "Tiendas", marker: "Stores" },
  { path: "/settings/marketing", label: "Marketing settings", marker: "Marketing" },
  { path: "/products", label: "Productos", marker: "Productos" },
  { path: "/orders", label: "Pedidos", marker: "Pedidos" },
  { path: "/contacts", label: "Contactos", marker: "Contactos" },
  { path: "/invoices", label: "Facturas", marker: "Facturas" },
  { path: "/marketing", label: "Marketing", marker: "Marketing" },
  { path: "/operations", label: "Operaciones", marker: "Operaciones" },
  { path: "/superadmin", label: "Super Admin", marker: "Super Admin" },
];

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
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

async function httpRequest(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    redirect: "manual",
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");
  return { response, body };
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.BASE_URL || process.argv[2] || DEFAULT_BASE_URL);
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  const results = [];
  const record = (name, ok, details = "") => {
    results.push({ name, ok, details });
    const suffix = details ? ` — ${details}` : "";
    console.log(`${formatResult(ok)}  ${name}${suffix}`);
  };

  record("BASE_URL", true, baseUrl);

  {
    const { response, body } = await httpRequest(baseUrl, "/api/health");
    const ok = response.ok && body && body.status === "ok" && body.app === "admin-web";
    record("GET /api/health", ok, ok ? "" : `status=${response.status}`);
  }

  {
    const { response, body } = await httpRequest(baseUrl, "/auth/login");
    const ok = response.ok && typeof body === "string" && body.includes("Nuevo acceso del admin central");
    record("GET /auth/login", ok, ok ? "" : `status=${response.status}`);
  }

  if (!adminEmail || !adminPassword) {
    record("Auth", false, "Define ADMIN_EMAIL y ADMIN_PASSWORD para validar páginas privadas.");
    process.exitCode = 1;
    return;
  }

  let cookieHeader = "";
  {
    const form = new URLSearchParams();
    form.set("email", adminEmail);
    form.set("password", adminPassword);
    const { response } = await httpRequest(baseUrl, "/api/session/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const cookies = getSetCookieHeaders(response.headers);
    cookieHeader = cookies
      .map((cookie) => String(cookie).split(";")[0])
      .filter(Boolean)
      .join("; ");
    const ok = (response.status === 302 || response.status === 303 || response.status === 307) && Boolean(cookieHeader);
    record("POST /api/session/login", ok, ok ? "cookie recibida" : `status=${response.status}`);
    if (!ok) {
      process.exitCode = 1;
      return;
    }
  }

  for (const page of PAGE_CHECKS) {
    const { response, body } = await httpRequest(baseUrl, page.path, {
      headers: {
        Cookie: cookieHeader,
      },
    });
    const ok = response.ok && typeof body === "string" && body.includes(page.marker);
    record(`GET ${page.path}`, ok, ok ? page.label : `status=${response.status}`);
  }

  const failed = results.filter((item) => !item.ok);
  console.log("");
  if (!failed.length) {
    console.log("Admin-web smoke test OK.");
    return;
  }
  console.log(`Admin-web smoke test FAIL (${failed.length}).`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
