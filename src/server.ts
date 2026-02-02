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

const app = express();

app.use(helmet());
app.use(morgan("combined"));
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
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  })
);

// Endpoint de salud para Render
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/auth", startShopifyOAuth);
app.get("/auth/callback", shopifyOAuthCallback);
app.get("/dashboard", (_req, res) => {
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
  startInventoryAdjustmentsPoller();
  startOrdersSyncPoller();
  startProductsSyncPoller();
  startRetryQueuePoller();
});
