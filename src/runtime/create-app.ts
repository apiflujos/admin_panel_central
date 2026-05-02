import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { createIntegrationApiRouter } from "../../apps/integration-api/src/router";
import { requirePageSuperAdmin } from "../../apps/integration-api/src/modules/auth/handlers/core-page-auth";
import { shopifyOAuthCallback, startShopifyOAuth } from "../../apps/integration-api/src/modules/auth/handlers/core-shopify-oauth";
import { getPool } from "../db";

function getAdminWebBaseUrl(req: express.Request): string {
  const configured = (process.env.ADMIN_WEB_URL || "").trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  const protocol = req.protocol || "http";
  const host = req.get("host") || "localhost";
  return `${protocol}://${host}`;
}

function redirectToAdminWeb(req: express.Request, res: express.Response, targetPath: string) {
  const baseUrl = getAdminWebBaseUrl(req);
  res.redirect(302, `${baseUrl}${targetPath}`);
}

export function createExpressApp() {
  const app = express();
  const apiRouter = createIntegrationApiRouter();

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

  app.get("/auth", startShopifyOAuth);
  app.get("/auth/callback", shopifyOAuthCallback);

  app.get("/", (req, res) => redirectToAdminWeb(req, res, "/"));
  app.get("/dashboard", (req, res) => redirectToAdminWeb(req, res, "/"));
  app.get("/settings", (req, res) => redirectToAdminWeb(req, res, "/settings/connections"));
  app.get("/settings/:pane", (req, res) => redirectToAdminWeb(req, res, "/settings/connections"));
  app.get("/__sa", requirePageSuperAdmin, (req, res) => redirectToAdminWeb(req, res, "/superadmin"));

  app.use("/api", apiRouter);
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}
