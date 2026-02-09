import "dotenv/config";
import express from "express";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";
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

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());
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

const publicDir = path.resolve("public");
app.use(
  express.static(publicDir, {
    setHeaders: (res, filePath) => {
      const lower = filePath.toLowerCase();
      if (lower.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
        return;
      }
      if (lower.endsWith("/app.js") || lower.endsWith("/styles.css")) {
        // Always revalidate core assets to avoid stale UI after deploys.
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      }
    },
  })
);

// Endpoint de salud para Render
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
    const safe =
      process.env.NODE_ENV === "production"
        ? "db_unavailable"
        : message;
    res.status(500).json({ status: "error", error: safe });
  }
});

app.get("/auth", startShopifyOAuth);
app.get("/auth/callback", shopifyOAuthCallback);
app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/__sa", requirePageSuperAdmin, (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use("/api", router);
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ error: "internal_error" });
});

// Importante: Usar process.env.PORT y host 0.0.0.0
const port = Number(process.env.PORT || 10000);
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log("-------------------------------------------");
  console.log(`Server listening on http://${host}:${port}`);
  console.log("-------------------------------------------");
  ensureSaDefaults().catch((error) => console.error("[sa] bootstrap failed", error));
  startInventoryAdjustmentsPoller();
  startOrdersSyncPoller();
  startProductsSyncPoller();
  startRetryQueuePoller();
  startMarketingJobs();
  startBillingReportCron();
});
