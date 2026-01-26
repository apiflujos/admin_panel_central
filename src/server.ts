import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { router } from "./api/routes";
import { authMiddleware, isAuthenticatedRequest } from "./api/auth.controller";
import { startInventoryAdjustmentsPoller } from "./jobs/inventory-adjustments";
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

const allowUnauthed = (path: string) =>
  path === "/login.html" ||
  path === "/login.js" ||
  path === "/styles.css" ||
  path === "/favicon.png" ||
  path.startsWith("/assets/");

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  if (req.path === "/health") return next();
  if (allowUnauthed(req.path)) return next();
  if (!isAuthenticatedRequest(req)) {
    res.redirect("/login.html");
    return;
  }
  next();
});

app.use(express.static("public"));

app.use(
  "/api",
  (req, res, next) => {
    if (req.path.startsWith("/auth/login")) return next();
    if (req.path.startsWith("/auth/logout")) return next();
    if (req.path.startsWith("/webhooks/")) return next();
    if (!isAuthenticatedRequest(req)) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  },
  router
);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// --- CONFIGURACIÓN CRÍTICA PARA RENDER ---
// Priorizamos process.env.PORT (que Render pone en 10000)
const port = Number(process.env.PORT || process.env.APP_PORT || 3000);

// Usamos '0.0.0.0' para que el tráfico externo pueda entrar al contenedor
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`🚀 Servidor escuchando en puerto ${port} (Host: ${host})`);
  
  // Iniciar procesos de fondo
  startInventoryAdjustmentsPoller();
  startRetryQueuePoller();
});
