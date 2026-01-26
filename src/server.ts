import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { router } from "./api/routes";
import { isAuthenticatedRequest } from "./api/auth.controller";
import { startInventoryAdjustmentsPoller } from "./jobs/inventory-adjustments";
import { startRetryQueuePoller } from "./jobs/retry-queue";

const app = express();

// Middlewares
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

// Rutas públicas
const allowUnauthed = (path: string) =>
  path === "/login.html" ||
  path === "/login.js" ||
  path === "/styles.css" ||
  path === "/favicon.png" ||
  path.startsWith("/assets/");

// Auth Middleware
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

// API Routes
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

// EL SALVAVIDAS: Endpoint de salud
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * CONFIGURACIÓN PARA RENDER (OBLIGATORIA)
 */
// Render usa la variable PORT (10000). Si no existe (local), usamos 3000.
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// DEBE SER '0.0.0.0' para que el tráfico de internet entre al contenedor.
const host = '0.0.0.0'; 

app.listen(port, host, () => {
  console.log("-----------------------------------------");
  console.log(`🚀 SERVIDOR ESCUCHANDO EN: http://${host}:${port}`);
  console.log("-----------------------------------------");
  
  // Iniciar tareas de fondo
  startInventoryAdjustmentsPoller();
  startRetryQueuePoller();
});
