#!/usr/bin/env bash
#
# Deploy script for admin_panel_central — client/becam.
#
# Usage:
#   cd /srv/apiflujos/becam/admin_panel_central
#   ./scripts/deploy-becam.sh              # full deploy
#   ./scripts/deploy-becam.sh smoke        # health checks only
#   ./scripts/deploy-becam.sh rollback <commit>  # rollback to a stable commit
#
# First run creates /srv/apiflujos/becam/.deploy.env, asks you to fill the
# Postgres/admin secrets, and exits. Once that file is complete every run is
# fully automatic.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REQUIRED_BRANCH="client/becam"

# Fixed Becam configuration
APP_NAME="becam"
APP_HOST="https://becam.apiflujos.com"
ADMIN_WEB_URL="https://becam.apiflujos.com"
# Ports are read from .deploy.env (defaults below)
APP_PORT="3007"
ADMIN_WEB_PORT="3200"
# DATABASE_NAME is read from .deploy.env (default: admin-central-becam)

# External config file with secrets (outside the repo)
DEPLOY_CONFIG="/srv/apiflujos/becam/.deploy.env"

usage() {
  echo "Usage: $0 [deploy|smoke|rollback <commit>]"
  exit 1
}

# ---------------------------------------------------------------------------
# Port detection
# ---------------------------------------------------------------------------
find_free_port() {
  local start="${1:-3000}"
  local end="${2:-4000}"
  local port
  for port in $(seq "${start}" "${end}"); do
    if ! ss -tln 2>/dev/null | grep -qE "[:\.]${port}\s"; then
      echo "${port}"
      return 0
    fi
  done
  err "No se encontró puerto libre entre ${start} y ${end}"
  return 1
}

update_deploy_config() {
  local key="${1}"
  local value="${2}"
  if grep -qE "^#?${key}=" "${DEPLOY_CONFIG}"; then
    sed -i "s/^#?${key}=.*/${key}=${value}/" "${DEPLOY_CONFIG}"
  else
    echo "${key}=${value}" >> "${DEPLOY_CONFIG}"
  fi
}

log() {
  echo -e "${BLUE}=== $1 ===${NC}"
}

ok() {
  echo -e "${GREEN}✓ $1${NC}"
}

warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

err() {
  echo -e "${RED}✗ $1${NC}"
}

# ---------------------------------------------------------------------------
# Preconditions
# ---------------------------------------------------------------------------
for cmd in node npm pm2; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "$cmd no está instalado"
    exit 1
  fi
done

if [ ! -f "package.json" ]; then
  err "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "${CURRENT_BRANCH}" != "${REQUIRED_BRANCH}" ]; then
  err "Debes estar en la branch ${REQUIRED_BRANCH}. Actual: ${CURRENT_BRANCH}"
  exit 1
fi

# ---------------------------------------------------------------------------
# Load or create deploy config
# ---------------------------------------------------------------------------
load_deploy_config() {
  if [ ! -f "${DEPLOY_CONFIG}" ]; then
    warn "Creando archivo de configuración ${DEPLOY_CONFIG}..."
    mkdir -p "$(dirname "${DEPLOY_CONFIG}")"
    cat > "${DEPLOY_CONFIG}" <<'EOF'
# Configuración local de despliegue para Becam
# Este archivo NO se versiona y vive fuera del repositorio.
# Completa los valores y vuelve a ejecutar ./scripts/deploy-becam.sh

# Puertos (déjalos en blanco para detección automática)
APP_PORT=
ADMIN_WEB_PORT=

# Postgres (para la aplicación)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=admin-central-becam
DATABASE_USER=apiflujos
DATABASE_PASSWORD=

# Postgres admin (usado solo para crear la base de datos si no existe)
DATABASE_ADMIN_USER=postgres
DATABASE_ADMIN_PASSWORD=

# Primer usuario admin de la plataforma
ADMIN_EMAIL=admin@becam.com
ADMIN_PASSWORD=
EOF
    chmod 600 "${DEPLOY_CONFIG}"
    err "Completa ${DEPLOY_CONFIG} con los passwords y vuelve a ejecutar este script."
    exit 1
  fi

  # shellcheck source=/dev/null
  source "${DEPLOY_CONFIG}"

  : "${DATABASE_HOST:?${DEPLOY_CONFIG} no define DATABASE_HOST}"
  : "${DATABASE_PORT:?${DEPLOY_CONFIG} no define DATABASE_PORT}"
  : "${DATABASE_USER:?${DEPLOY_CONFIG} no define DATABASE_USER}"
  : "${DATABASE_PASSWORD:?${DEPLOY_CONFIG} no define DATABASE_PASSWORD}"
  : "${DATABASE_ADMIN_USER:?${DEPLOY_CONFIG} no define DATABASE_ADMIN_USER}"
  : "${DATABASE_ADMIN_PASSWORD:?${DEPLOY_CONFIG} no define DATABASE_ADMIN_PASSWORD}"
  : "${ADMIN_EMAIL:?${DEPLOY_CONFIG} no define ADMIN_EMAIL}"
  : "${ADMIN_PASSWORD:?${DEPLOY_CONFIG} no define ADMIN_PASSWORD}"

  DATABASE_NAME="${DATABASE_NAME:-admin-central-becam}"

  # Ports must be explicitly configured. Auto-detection is dangerous because
  # the reverse proxy (Nginx Proxy Manager) is configured out-of-band.
  if [ -z "${APP_PORT:-}" ]; then
    err "APP_PORT no está definido en ${DEPLOY_CONFIG}. Configúralo explícitamente."
    exit 1
  fi
  if [ -z "${ADMIN_WEB_PORT:-}" ]; then
    err "ADMIN_WEB_PORT no está definido en ${DEPLOY_CONFIG}. Configúralo explícitamente."
    exit 1
  fi

  DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
  DATABASE_ADMIN_URL="postgresql://${DATABASE_ADMIN_USER}:${DATABASE_ADMIN_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/postgres"
}

# ---------------------------------------------------------------------------
# Ensure database exists
# ---------------------------------------------------------------------------
ensure_database_exists() {
  log "Verificando base de datos ${DATABASE_NAME}..."

  # First try to connect to the target database directly.
  # This avoids needing permissions on the 'postgres' system database.
  if PGPASSWORD="${DATABASE_PASSWORD}" psql "${DATABASE_URL}" -c "SELECT 1;" >/dev/null 2>&1; then
    ok "Base de datos ${DATABASE_NAME} ya existe y es accesible"
    return 0
  fi

  warn "Base de datos ${DATABASE_NAME} no accesible. Intentando crearla..."

  if ! command -v psql >/dev/null 2>&1; then
    err "psql no está instalado. Crea la base de datos manualmente:"
    echo "  CREATE DATABASE \"${DATABASE_NAME}\";"
    exit 1
  fi

  PGPASSWORD="${DATABASE_ADMIN_PASSWORD}" psql \
    "${DATABASE_ADMIN_URL}" \
    -c "CREATE DATABASE \"${DATABASE_NAME}\";" >/dev/null 2>&1 || {
      err "No se pudo crear la base de datos."
      echo "Verifica que ${DATABASE_ADMIN_USER} tenga permisos de CREATE DATABASE y que el password sea correcto."
      echo "Si la base de datos ya existe, verifica que DATABASE_PASSWORD y DATABASE_URL sean correctos."
      exit 1
    }
  ok "Base de datos ${DATABASE_NAME} creada"
}

# ---------------------------------------------------------------------------
# Generate .env
# ---------------------------------------------------------------------------
ensure_env() {
  local env_changed=false

  # Backup the existing .env before mutating it.
  if [ -f ".env" ]; then
    cp .env ".env.backup.$(date +%Y%m%d%H%M%S)"
  fi

  if [ ! -f ".env" ]; then
    log "Generando .env desde .env.becam.example..."
    if [ ! -f ".env.becam.example" ]; then
      err "No se encontró .env.becam.example"
      exit 1
    fi
    cp .env.becam.example .env
    env_changed=true
  fi

  # Generate secure secrets if placeholders are still present
  if grep -qE '^CRYPTO_KEY_BASE64=(GENERATE_32B_BASE64|)$' .env; then
    CRYPTO_KEY_BASE64=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    sed -i "s|^CRYPTO_KEY_BASE64=.*|CRYPTO_KEY_BASE64=${CRYPTO_KEY_BASE64}|" .env
    env_changed=true
  fi
  if grep -qE '^CSRF_SECRET=(CHANGE_ME_LONG_RANDOM|)$' .env; then
    CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s|^CSRF_SECRET=.*|CSRF_SECRET=${CSRF_SECRET}|" .env
    env_changed=true
  fi

  # Ensure fixed/known values are correct; add them if missing
  local key value
  for key in APP_HOST APP_PORT ADMIN_WEB_URL ADMIN_WEB_PORT DATABASE_URL ADMIN_EMAIL ADMIN_PASSWORD RUN_WORKERS_IN_WEB; do
    case "$key" in
      APP_HOST) value="${APP_HOST}" ;;
      APP_PORT) value="${APP_PORT}" ;;
      ADMIN_WEB_URL) value="${APP_HOST}" ;;
      ADMIN_WEB_PORT) value="${ADMIN_WEB_PORT}" ;;
      DATABASE_URL) value="${DATABASE_URL}" ;;
      ADMIN_EMAIL) value="${ADMIN_EMAIL}" ;;
      ADMIN_PASSWORD) value="${ADMIN_PASSWORD}" ;;
      RUN_WORKERS_IN_WEB) value="false" ;;
    esac
    if grep -qE "^${key}=" .env; then
      sed -i "s|^${key}=.*|${key}=${value}|" .env
    else
      echo "${key}=${value}" >> .env
      env_changed=true
    fi
  done

  # Always force ADMIN_WEB_URL to the public domain so Next.js generates
  # correct absolute URLs for scripts/stylesheets.
  local current_admin_web_url
  current_admin_web_url=$(grep '^ADMIN_WEB_URL=' .env | cut -d= -f2)
  if [ "${current_admin_web_url}" != "${APP_HOST}" ]; then
    sed -i "s|^ADMIN_WEB_URL=.*|ADMIN_WEB_URL=${APP_HOST}|" .env
    env_changed=true
    ok "ADMIN_WEB_URL corregido de ${current_admin_web_url} a ${APP_HOST}"
  fi

  chmod 600 .env
  if [ "$env_changed" = true ]; then
    ok ".env actualizado en $(pwd)/.env"
  else
    ok ".env ya existe y está completo, no se modifica"
  fi

  echo ""
  echo "Valores clave en .env:"
  echo "  APP_HOST=$(grep '^APP_HOST=' .env | cut -d= -f2)"
  echo "  APP_PORT=$(grep '^APP_PORT=' .env | cut -d= -f2)"
  echo "  ADMIN_WEB_URL=$(grep '^ADMIN_WEB_URL=' .env | cut -d= -f2)"
  echo "  ADMIN_WEB_PORT=$(grep '^ADMIN_WEB_PORT=' .env | cut -d= -f2)"
}

# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------
do_deploy() {
  log "Deploy ${APP_NAME}"

  load_deploy_config

  log "Pull de origin/${REQUIRED_BRANCH}..."
  git pull origin "${REQUIRED_BRANCH}"

  log "Instalando dependencias (npm ci)..."
  npm ci
  npm ci --prefix apps/admin-web

  ensure_database_exists
  ensure_env

  log "Compilando backend..."
  npm run build

  log "Compilando admin-web..."
  # Clean previous build so Next.js does not reuse stale ADMIN_WEB_URL values.
  rm -rf apps/admin-web/.next
  SKIP_NEXT_VALIDATION=1 npm run build:admin-web

  # Sanity check: the generated HTML must not reference localhost.
  if grep -rE 'https?://localhost:3200' apps/admin-web/.next 2>/dev/null | head -1; then
    err "El build de admin-web aún contiene referencias a localhost:3200."
    err "Verifica que ADMIN_WEB_URL en .env sea https://becam.apiflujos.com"
    exit 1
  fi

  # Copy static assets into the standalone output. Next.js standalone does not
  # include them automatically, and without this the standalone server returns
  # 404 for /_next/static/* if it is ever reached directly.
  log "Copiando estáticos al directorio standalone..."
  mkdir -p apps/admin-web/.next/standalone/apps/admin-web/.next
  rm -rf apps/admin-web/.next/standalone/apps/admin-web/.next/static
  cp -r apps/admin-web/.next/static apps/admin-web/.next/standalone/apps/admin-web/.next/
  if [ -d "apps/admin-web/public" ]; then
    rm -rf apps/admin-web/.next/standalone/apps/admin-web/public
    cp -r apps/admin-web/public apps/admin-web/.next/standalone/apps/admin-web/
  fi
  ok "Estáticos copiados"

  log "Validando artefactos de build..."
  test -f dist/src/server.js || { err "No se encontró dist/src/server.js"; exit 1; }
  test -f dist/apps/workers/src/bootstrap.js || { err "No se encontró dist/apps/workers/src/bootstrap.js"; exit 1; }
  test -f apps/admin-web/.next/standalone/apps/admin-web/server.js || { err "No se encontró el servidor standalone de admin-web"; exit 1; }
  test -d apps/admin-web/.next/standalone/apps/admin-web/.next/static || { err "No se copiaron los estáticos de admin-web"; exit 1; }
  ok "Artefactos de build validados"

  log "Ejecutando migraciones..."
  npm run db:migrate

  log "Gestionando procesos PM2..."
  if pm2 list 2>/dev/null | grep -qE "becam-api|becam-admin-web|becam-workers"; then
    pm2 reload ecosystem.config.js
  else
    pm2 start ecosystem.config.js
  fi

  pm2 save || true

  ok "Deploy completado"

  log "Esperando 10 segundos a que los servicios arranquen..."
  sleep 10

  do_smoke
}

# ---------------------------------------------------------------------------
# Smoke tests
# ---------------------------------------------------------------------------
do_smoke() {
  log "Smoke tests"

  local api_ok=false
  local web_ok=false

  if curl -fsS "http://127.0.0.1:${APP_PORT}/health" >/dev/null 2>&1; then
    ok "API /health responde en puerto ${APP_PORT}"
    api_ok=true
  else
    err "API /health NO responde en puerto ${APP_PORT}"
  fi

  if curl -fsS "http://127.0.0.1:${APP_PORT}/auth/login" >/dev/null 2>&1; then
    ok "Admin-web responde a través del puerto único ${APP_PORT}"
    web_ok=true
  else
    err "Admin-web NO responde a través del puerto ${APP_PORT}"
  fi

  # Verify that a real Next.js static asset is served with the correct MIME type.
  local css_file
  css_file=$(find apps/admin-web/.next/static/css -name '*.css' | head -n 1 | sed 's|apps/admin-web/.next/static||')
  if [ -n "${css_file}" ] && curl -fsS "http://127.0.0.1:${APP_PORT}/_next/static${css_file}" >/dev/null 2>&1; then
    ok "Asset estático de Next.js responde correctamente"
  else
    warn "No se pudo verificar el asset estático de Next.js"
  fi

  # Verify the admin-web login/session endpoint is reachable through the proxy.
  if curl -fsS -X POST "http://127.0.0.1:${APP_PORT}/api/session/login" -o /dev/null -w '%{http_code}' | grep -qE '30[23]|400'; then
    ok "Endpoint /api/session/login es alcanzable a través del proxy"
  else
    warn "Endpoint /api/session/login no respondió como se esperaba"
  fi

  if [ "$api_ok" = true ] && [ "$web_ok" = true ]; then
    ok "Smoke exitoso"
    echo ""
    echo "Puerto público único para Becam: ${APP_PORT}"
    echo "Configura en Nginx Proxy Manager:"
    echo "  ${APP_HOST}  -> http://127.0.0.1:${APP_PORT}"
    echo "El admin-web corre internamente en 127.0.0.1:${ADMIN_WEB_PORT} (no accesible desde fuera)."
  else
    err "Smoke falló. Revisa: pm2 logs"
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Rollback
# ---------------------------------------------------------------------------
do_rollback() {
  local commit="${1:-}"
  if [ -z "$commit" ]; then
    err "Falta el commit para rollback. Uso: $0 rollback <commit>"
    exit 1
  fi

  log "Rollback a ${commit}..."
  git fetch origin
  git checkout "$commit"
  npm ci
  npm ci --prefix apps/admin-web
  npm run build
  SKIP_NEXT_VALIDATION=1 npm run build:admin-web
  npm run db:migrate
  pm2 reload ecosystem.config.js
  pm2 save || true
  ok "Rollback completado a ${commit}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "${1:-deploy}" in
  deploy)
    do_deploy
    ;;
  smoke)
    do_smoke
    ;;
  rollback)
    do_rollback "${2:-}"
    ;;
  *)
    usage
    ;;
esac
