import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import type { NextFunction, Request, Response } from "express";
import { router } from "./api/routes";
import { shopifyOAuthCallback, startShopifyOAuth } from "./api/shopify-oauth.controller";
import { startInventoryAdjustmentsPoller } from "./jobs/inventory-adjustments";
import { startOrdersSyncPoller } from "./jobs/orders-sync";
import { startProductsSyncPoller } from "./jobs/products-sync";
import { startRetryQueuePoller } from "./jobs/retry-queue";
import { startBillingReportCron } from "./jobs/billing-report";
import { ensureSaDefaults } from "./sa/sa.bootstrap";
import { requirePageSuperAdmin } from "./api/page-auth";
import { getPool } from "./db";
import { createCsrfToken } from "./utils/csrf";
import { assertStartupEnv } from "./utils/env-check";
import { getSessionUser } from "./services/auth.service";

// Fail-fast: si faltan env vars críticas, no arrancar. Los pollers Shopify usan APP_HOST
// para construir redirect_uri, así que lo requerimos si se planea recibir OAuth callbacks.
assertStartupEnv({ requireShopifyOAuth: true });

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// HSTS solo cuando el sitio se sirve por https (producción). En local el app
// corre en http://localhost y enviar Strict-Transport-Security haría que el
// navegador fuerce https para localhost, rompiendo la carga de assets (CSS/JS).
const servesHttps = String(process.env.APP_HOST || "")
  .trim()
  .toLowerCase()
  .startsWith("https://");

app.use(
  helmet({
    hsts: servesHttps ? { maxAge: 15552000, includeSubDomains: true } : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
  })
);

const stripQuery = (url: string) => url.split("?")[0] || url;
app.use(
  morgan((tokens: any, req: any, res: any) => {
    const url = stripQuery(String(req.originalUrl || req.url || ""));
    return [
      tokens["remote-addr"](req, res),
      "-",
      tokens["remote-user"](req, res),
      `[${tokens.date(req, res, "clf")}]`,
      `"${tokens.method(req, res)} ${url} HTTP/${tokens["http-version"](req, res)}"`,
      tokens.status(req, res),
      tokens.res(req, res, "content-length"),
      `"${tokens.referrer(req, res)}"`,
      `"${tokens["user-agent"](req, res)}"`,
    ].join(" ");
  })
);

// Webhook paths necesitan el body crudo antes de que JSON parsers lo transformen (para HMAC).
// Cap 5MB para tolerar órdenes con muchos line items / metafields.
app.use(
  "/api/webhooks",
  express.raw({
    type: "*/*",
    limit: "5mb",
  })
);
app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      (req as { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

const publicDir = path.resolve("public");
const adminWebDir = path.resolve("apps/admin-web");

// ---------------------------------------------------------------------------
// Initialize Next.js as an Express middleware.
// This is the single-port architecture: Express owns the public port and
// delegates non-API requests to Next.js.
// ---------------------------------------------------------------------------
async function initAdminWeb(): Promise<(req: Request, res: Response) => void> {
  const nextModulePath = path.join(adminWebDir, "node_modules", "next");
  if (!fs.existsSync(nextModulePath)) {
    throw new Error(`Next.js not found at ${nextModulePath}. Run npm ci --prefix apps/admin-web`);
  }

  const nextBuildDir = path.join(adminWebDir, ".next");
  if (!fs.existsSync(nextBuildDir)) {
    throw new Error(`Next.js build not found at ${nextBuildDir}. Run npm run build:admin-web`);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const next = require(nextModulePath);
  const nextApp = next({ dev: false, dir: adminWebDir });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();
  console.log("[admin-web] Next.js middleware ready");
  return (req: Request, res: Response) => handle(req, res);
}

// ---------------------------------------------------------------------------
// 1. Health checks
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health/db", async (_req, res) => {
  try {
    const pool = getPool();
    await pool.query("SELECT 1 as ok");
    const info = await pool.query<{
      organizations: string | null;
      users: string | null;
      user_sessions: string | null;
    }>(
      `
      SELECT
        to_regclass('public.organizations') as organizations,
        to_regclass('public.users') as users,
        to_regclass('public.user_sessions') as user_sessions
      `
    );
    const row = info.rows[0] || { organizations: null, users: null, user_sessions: null };
    res.status(200).json({
      status: "ok",
      tables: {
        organizations: Boolean(row.organizations),
        users: Boolean(row.users),
        user_sessions: Boolean(row.user_sessions),
      },
    });
  } catch (error) {
    console.error("[health] db check failed:", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    const safe = process.env.NODE_ENV === "production" ? "db_unavailable" : message;
    res.status(500).json({ status: "error", error: safe });
  }
});

// ---------------------------------------------------------------------------
// 2. Clean URL redirects for legacy HTML files.
// ---------------------------------------------------------------------------
app.get("/login.html", (_req, res) => res.redirect(302, "/auth/login"));
app.get("/index.html", (_req, res) => res.redirect(302, "/"));
app.get("/company.html", (_req, res) => res.redirect(302, "/company"));
app.get("/users.html", (_req, res) => res.redirect(302, "/users"));
app.get("/ai-assistants.html", (_req, res) => res.redirect(302, "/ai-assistants"));

// ---------------------------------------------------------------------------
// 3. Legacy OAuth endpoints (must stay in Express).
// ---------------------------------------------------------------------------
app.get("/auth", startShopifyOAuth);
app.get("/auth/callback", shopifyOAuthCallback);

// ---------------------------------------------------------------------------
// 4. Admin-web owned API prefixes.
//    These route handlers live inside apps/admin-web/app/api and must reach
//    Next.js before falling into the Express router.
// ---------------------------------------------------------------------------
function mountAdminWeb(prefix: string, handle: (req: Request, res: Response) => void) {
  app.use(prefix, (req, res) => {
    // Express strips the mount `prefix` from req.url, but Next's request handler
    // routes on req.url — so it would look up e.g. `/connections/workspace`
    // instead of `/api/admin-web/connections/workspace` and 404. Restore the
    // full original path (incl. query) before delegating to Next.
    req.url = req.originalUrl;
    handle(req, res);
  });
}

// Note: app.use("/api", router) is intentionally registered inside startServer()
// so that /api/session and /api/admin-web are mounted before it.

// ---------------------------------------------------------------------------
// 5. Legacy fallback UI.
//    Kept only under /legacy/*. Protected server-side so it never flashes a
//    logged-in shell for an anonymous visitor.
// ---------------------------------------------------------------------------
const indexHtmlPath = path.join(publicDir, "index.html");
const loginHtmlPath = path.join(publicDir, "login.html");

function getSessionToken(req: Request): string | null {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith("os_session=")) {
      return decodeURIComponent(trimmed.slice("os_session=".length)) || null;
    }
  }
  return null;
}

async function requirePageSession(req: Request, res: Response, next: NextFunction) {
  const token = getSessionToken(req);
  if (!token) {
    res.redirect(302, "/auth/login");
    return;
  }
  try {
    const user = await getSessionUser(token);
    if (!user) {
      res.redirect(302, "/auth/login");
      return;
    }
    (req as any).sessionUser = user;
    next();
  } catch (error) {
    console.error("[page-auth] session validation failed:", error);
    res.redirect(302, "/auth/login");
  }
}

function renderIndex(req: Request, res: Response, bodyClass?: string) {
  try {
    let html = fs.readFileSync(indexHtmlPath, "utf8");
    const sessionToken = getSessionToken(req);
    const csrf = sessionToken ? (createCsrfToken(sessionToken) ?? "") : "";
    html = html.replace("</head>", `<meta name="csrf-token" content="${csrf}">\n</head>`);
    if (bodyClass) {
      html = html.replace(/<body(\s[^>]*)?>/i, (match, attrs = "") => {
        if (/class=/.test(attrs)) {
          return match.replace(/class=("|')([^"']*)("|')/i, (_full, quote, value) => {
            const next = value.includes(bodyClass) ? value : `${value} ${bodyClass}`.trim();
            return `class=${quote}${next}${quote}`;
          });
        }
        return `<body${attrs} class="${bodyClass}">`;
      });
    }
    if (bodyClass?.includes("legacy-surface")) {
      html = html.replace(
        /<body(\s[^>]*)?>/i,
        (match) =>
          `${match}\n<div class="legacy-banner" role="status">Modo legado activo. Usa esta superficie solo como fallback operativo.</div>`
      );
    }
    res.setHeader("Cache-Control", "no-store");
    res.send(html);
  } catch (error) {
    console.error("[render] failed:", error);
    res.status(500).send("error");
  }
}

app.get("/dashboard", (_req, res) => res.redirect(302, "/"));
app.get("/settings", (_req, res) => res.redirect(302, "/settings/connections"));
app.get("/settings/:pane", (req, res, next) => {
  const pane = String(req.params.pane || "").trim().toLowerCase();
  // These settings panes are handled by the new admin-web.
  if (pane === "connections" || pane === "stores") {
    next();
    return;
  }
  // Legacy fallback for any other settings pane.
  res.redirect(302, `/legacy/settings/${pane}`);
});
app.get("/__sa", requirePageSuperAdmin, (_req, res) => res.redirect(302, "/superadmin"));

app.get("/legacy/dashboard", requirePageSession, (req, res) => renderIndex(req, res, "legacy-surface"));
app.get("/legacy/login", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(loginHtmlPath);
});
app.get("/legacy/settings", requirePageSession, (_req, res) => res.redirect(302, "/legacy/settings/connections"));
app.get("/legacy/settings/:pane", requirePageSession, (req, res) => {
  const pane = String(req.params.pane || "").trim().toLowerCase();
  if (pane === "connections") {
    if (pane !== "connections") {
      res.redirect(302, "/legacy/settings/connections");
      return;
    }
    renderIndex(req, res, "force-settings legacy-surface");
    return;
  }
  renderIndex(req, res, "force-settings legacy-surface");
});
app.get("/legacy/__sa", requirePageSuperAdmin, requirePageSession, (req, res) => renderIndex(req, res, "legacy-surface"));

// Serve remaining legacy static files (app.js, styles.css, login.js, etc.)
// without allowing index.html to be used as a fallback.
app.use(
  express.static(publicDir, {
    index: false,
    setHeaders: (res, filePath) => {
      const lower = filePath.toLowerCase();
      if (lower.endsWith("/app.js") || lower.endsWith("/styles.css")) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      }
    },
  })
);

// ---------------------------------------------------------------------------
// 6. Global error handler.
// ---------------------------------------------------------------------------
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: "internal_error" });
});

// ---------------------------------------------------------------------------
// 7. Start server and background jobs.
// ---------------------------------------------------------------------------
const port = Number(process.env.APP_PORT || process.env.PORT || 10000);
const host = "0.0.0.0";
const runWorkersInWeb =
  String(process.env.RUN_WORKERS_IN_WEB || "true")
    .trim()
    .toLowerCase() !== "false";

async function startServer() {
  const adminWebHandle = await initAdminWeb();

  // Admin-web owned API prefixes first.
  mountAdminWeb("/api/session", adminWebHandle);
  mountAdminWeb("/api/admin-web", adminWebHandle);

  // Express REST API for everything else under /api.
  app.use("/api", router);

  // Everything else is handled by Next.js.
  app.use((req, res) => adminWebHandle(req, res));

  const server = app.listen(port, host, () => {
    console.log("-------------------------------------------");
    console.log(`Server listening on http://${host}:${port}`);
    console.log("-------------------------------------------");
    ensureSaDefaults().catch((error) => console.error("[sa] bootstrap failed", error));
    if (runWorkersInWeb) {
      console.log("[workers] running inside web process");
      startInventoryAdjustmentsPoller();
      startOrdersSyncPoller();
      startProductsSyncPoller();
      startRetryQueuePoller();
      startBillingReportCron();
      return;
    }
    console.log("[workers] skipped in web process (RUN_WORKERS_IN_WEB=false)");
  });

  // Graceful shutdown.
  async function closeResources() {
    console.log("[shutdown] closing HTTP server...");
    server.close(() => {
      console.log("[shutdown] HTTP server closed");
    });
    try {
      await getPool().end();
      console.log("[shutdown] Postgres pool closed");
    } catch (error) {
      console.error("[shutdown] failed to close Postgres pool:", error);
    }
  }

  process.on("SIGTERM", () => {
    closeResources().finally(() => process.exit(0));
  });

  process.on("SIGINT", () => {
    closeResources().finally(() => process.exit(0));
  });
}

startServer().catch((error) => {
  console.error("[server] failed to start:", error);
  process.exit(1);
});
