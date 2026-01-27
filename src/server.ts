import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { router } from "./api/routes";
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

app.use(express.static("public"));

// Endpoint de salud para Render
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", router);

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
