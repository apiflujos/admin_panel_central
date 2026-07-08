// PM2 ecosystem para el cliente becam (rama client/becam).
// Uso:
//   pm2 start ecosystem.config.js
//   pm2 reload ecosystem.config.js
//   pm2 status
//
// Para otros clientes, cada rama trae su propio ecosystem.*.js si aplica.

const path = require("path");
const fs = require("fs");

const cwd = path.resolve(__dirname);
const adminWebCwd = path.join(cwd, "apps", "admin-web");

// PM2 no lee .env por sí solo y el standalone de Next.js tampoco.
// Precargamos .env (repo root) y lo propagamos como env a cada app.
// El backend y los workers también lo importan por dotenv/config, así que
// esto solo agrega redundancia segura para ellos.
const envFilePath = path.join(cwd, ".env");
const envFromFile = fs.existsSync(envFilePath)
  ? require("dotenv").parse(fs.readFileSync(envFilePath, "utf8"))
  : {};

const shared = { ...envFromFile, NODE_ENV: "production" };

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
        APP_PORT: "3007",
        RUN_WORKERS_IN_WEB: "false",
      },
      max_memory_restart: "512M",
      autorestart: true,
      watch: false,
      kill_timeout: 10000,
      listen_timeout: 30000,
      out_file: "logs/becam-api.out.log",
      error_file: "logs/becam-api.err.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "becam-admin-web",
      cwd: adminWebCwd,
      script: ".next/standalone/apps/admin-web/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        ...shared,
        PORT: "3200",
        HOSTNAME: "0.0.0.0",
      },
      max_memory_restart: "512M",
      autorestart: true,
      watch: false,
      kill_timeout: 10000,
      listen_timeout: 30000,
      out_file: "../../logs/becam-admin-web.out.log",
      error_file: "../../logs/becam-admin-web.err.log",
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
