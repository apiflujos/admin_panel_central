// PM2 ecosystem para el cliente becam (rama client/becam).
// Uso:
//   pm2 start ecosystem.config.js
//   pm2 reload ecosystem.config.js
//   pm2 status
//
// Nota: el admin-web Next.js corre como middleware dentro del proceso
// becam-api, por lo que no hay un proceso separado ni un puerto interno
// adicional. El dominio público apunta únicamente a APP_PORT.

const path = require("path");
const fs = require("fs");

const cwd = path.resolve(__dirname);

// PM2 no lee .env por sí solo. Precargamos .env (repo root) y lo propagamos
// como env a cada app. El backend y los workers también lo importan por
// dotenv/config, así que esto solo agrega redundancia segura.
const envFilePath = path.join(cwd, ".env");
const envFromFile = fs.existsSync(envFilePath)
  ? require("dotenv").parse(fs.readFileSync(envFilePath, "utf8"))
  : {};

const shared = { ...envFromFile, NODE_ENV: "production" };

// Public port for the combined backend + admin-web server.
const appPort = shared.APP_PORT || process.env.APP_PORT || "3007";

module.exports = {
  apps: [
    {
      name: "becam-api",
      cwd,
      script: "dist/src/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        ...shared,
        APP_PORT: appPort,
        RUN_WORKERS_IN_WEB: "false",
      },
      max_memory_restart: "1G",
      autorestart: true,
      watch: false,
      kill_timeout: 15000,
      listen_timeout: 60000,
      out_file: "logs/becam-api.out.log",
      error_file: "logs/becam-api.err.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "becam-workers",
      cwd,
      script: "dist/apps/workers/src/bootstrap.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        ...shared,
        RUN_WORKERS_IN_WEB: "false",
      },
      max_memory_restart: "768M",
      autorestart: true,
      watch: false,
      kill_timeout: 15000,
      listen_timeout: 30000,
      out_file: "logs/becam-workers.out.log",
      error_file: "logs/becam-workers.err.log",
      merge_logs: true,
      time: true,
    },
  ],
};
