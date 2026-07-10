import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";
import { router } from "./api/routes";
import { shopifyOAuthCallback, startShopifyOAuth } from "./api/shopify-oauth.controller";
import { startInventoryAdjustmentsPoller } from "./jobs/inventory-adjustments";
import { startOrdersSyncPoller } from "./jobs/orders-sync";
import { startProductsSyncPoller } from "./jobs/products-sync";
import { startRetryQueuePoller } from "./jobs/retry-queue";
import { startMarketingJobs } from "./jobs/marketing";
import { startBillingReportCron } from "./jobs/billing-report";
import { ensureSaDefaults } from "./sa/sa.bootstrap";
import { requirePageSuperAdmin } from "./api/page-auth";
import { getPool } from "./db";
import { createCsrfToken } from "./utils/csrf";
import { getSessionUser } from "./services/auth.service";

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
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

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      (req as { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

const adminWebPort = process.env.ADMIN_WEB_PORT;
const adminWebTarget = adminWebPort && Number(adminWebPort) > 0 ? `http://127.0.0.1:${adminWebPort}` : null;
const publicDir = path.resolve("public");

// ---------------------------------------------------------------------------
// 1. Health checks (no proxy, no auth)
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
// 2. Next.js static assets — served directly from the build output.
//    This avoids proxying to the standalone server, which has repeatedly
//    returned 307 redirects when the static files were not copied into the
//    standalone directory.
// ---------------------------------------------------------------------------
const nextStaticDir = path.resolve("apps/admin-web/.next/static");
if (fs.existsSync(nextStaticDir)) {
  app.use(
    "/_next/static",
    express.static(nextStaticDir, {
      maxAge: "1y",
      immutable: true,
    })
  );
} else if (adminWebTarget) {
  console.warn("[server] Next.js static assets not found at", nextStaticDir, "— falling back to proxy");
  app.use(
    "/_next/static",
    createProxyMiddleware({
      target: adminWebTarget,
      changeOrigin: false,
    })
  );
}

// ---------------------------------------------------------------------------
// 3. Shared public assets (branding, favicon, etc.).
//    These live in public/ and are used by both the legacy and the new UI.
// ---------------------------------------------------------------------------
app.use(
  "/assets",
  express.static(path.join(publicDir, "assets"), {
    maxAge: "1d",
  })
);
app.use(
  "/brands",
  express.static(path.join(publicDir, "brands"), {
    maxAge: "1d",
  })
);
app.use("/favicon.png", express.static(path.join(publicDir, "favicon.png"), { maxAge: "1d" }));
app.use("/brand.json", express.static(path.join(publicDir, "brand.json"), { maxAge: "1m" }));

// ---------------------------------------------------------------------------
// 4. Clean URL redirects for legacy HTML files.
// ---------------------------------------------------------------------------
app.get("/login.html", (_req, res) => res.redirect(302, "/auth/login"));
app.get("/index.html", (_req, res) => res.redirect(302, "/"));
app.get("/company.html", (_req, res) => res.redirect(302, "/company"));
app.get("/users.html", (_req, res) => res.redirect(302, "/users"));
app.get("/ai-assistants.html", (_req, res) => res.redirect(302, "/ai-assistants"));

// ---------------------------------------------------------------------------
// 5. Legacy OAuth endpoints (must stay in Express).
// ---------------------------------------------------------------------------
app.get("/auth", startShopifyOAuth);
app.get("/auth/callback", shopifyOAuthCallback);

// ---------------------------------------------------------------------------
// 6. Admin-web own API endpoints.
//    The new frontend mounts its login/session and its data API under these
//    prefixes. They must reach the Next.js standalone server, not Express.
// ---------------------------------------------------------------------------
if (adminWebTarget) {
  console.log(`[proxy] routing /api/session/* and /api/admin-web/* to admin-web at ${adminWebTarget}`);
  app.use(
    "/api/session",
    createProxyMiddleware({
      target: adminWebTarget,
      changeOrigin: false,
    })
  );
  app.use(
    "/api/admin-web",
    createProxyMiddleware({
      target: adminWebTarget,
      changeOrigin: false,
    })
  );
}

// ---------------------------------------------------------------------------
// 7. Express REST API (default owner of /api/*).
// ---------------------------------------------------------------------------
app.use("/api", router);

// ---------------------------------------------------------------------------
// 8. Legacy fallback UI.
//    Only exposed under /legacy/*. When admin-web is configured, the new
//    frontend owns the root paths. The legacy surface is kept as an emergency
//    fallback and is protected server-side so it never flashes a logged-in
//    shell for an anonymous visitor.
// ---------------------------------------------------------------------------
const indexHtmlPath = path.join(publicDir, "index.html");
const loginHtmlPath = path.join(publicDir, "login.html");

function getSessionToken(req: express.Request): string | null {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith("os_session=")) {
      return decodeURIComponent(trimmed.slice("os_session=".length)) || null;
    }
  }
  return null;
}

async function requirePageSession(req: express.Request, res: express.Response, next: express.NextFunction) {
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

function renderIndex(req: express.Request, res: express.Response, bodyClass?: string) {
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
app.get("/settings/:pane", (req, res) => {
  const pane = String(req.params.pane || "").trim().toLowerCase();
  if (pane === "connections" || pane === "stores" || pane === "marketing") {
    res.redirect(302, `/settings/${pane}`);
    return;
  }
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
  if (pane === "connections" || pane === "stores" || pane === "marketing") {
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
// without allowing index.html to be used as a fallback. This keeps the legacy
// UI functional under /legacy/* while preventing it from hijacking the root.
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
// 9. Catch-all proxy to the Next.js admin-web app.
//    When admin-web is not configured, the legacy index becomes the fallback.
// ---------------------------------------------------------------------------
if (adminWebTarget) {
  console.log(`[proxy] routing remaining non-API traffic to admin-web at ${adminWebTarget}`);
  app.use(
    createProxyMiddleware({
      target: adminWebTarget,
      changeOrigin: false,
      ws: true,
      pathFilter: (pathname) => {
        // Backend paths handled directly by this server.
        if (pathname.startsWith("/api/")) return false;
        if (pathname === "/health" || pathname === "/health/db") return false;
        if (pathname.startsWith("/_next/static")) return false;
        if (pathname.startsWith("/assets/")) return false;
        if (pathname.startsWith("/brands/")) return false;
        if (pathname === "/favicon.png" || pathname === "/brand.json") return false;
        // Legacy OAuth endpoints stay in Express.
        if (pathname === "/auth" || pathname === "/auth/callback") return false;
        // Legacy fallback UI stays in Express.
        if (pathname.startsWith("/legacy/")) return false;
        return true;
      },
    })
  );
} else {
  console.log("[server] ADMIN_WEB_PORT not configured; using legacy index.html as fallback");
  app.get("/", (req, res) => renderIndex(req, res));
}

// ---------------------------------------------------------------------------
// 10. Global error handler.
// ---------------------------------------------------------------------------
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: "internal_error" });
});

// ---------------------------------------------------------------------------
// 11. Start server and background jobs.
// ---------------------------------------------------------------------------
const port = Number(process.env.APP_PORT || process.env.PORT || 10000);
const host = "0.0.0.0";
const runWorkersInWeb =
  String(process.env.RUN_WORKERS_IN_WEB || "true")
    .trim()
    .toLowerCase() !== "false";

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
    startMarketingJobs();
    startBillingReportCron();
    return;
  }
  console.log("[workers] skipped in web process (RUN_WORKERS_IN_WEB=false)");
});

// ---------------------------------------------------------------------------
// 12. Graceful shutdown.
// ---------------------------------------------------------------------------
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
