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
APP_PORT="3007"
ADMIN_WEB_PORT="3200"
DATABASE_NAME="admin-central-becam"

# External config file with secrets (outside the repo)
DEPLOY_CONFIG="/srv/apiflujos/becam/.deploy.env"

usage() {
  echo "Usage: $0 [deploy|smoke|rollback <commit>]"
  exit 1
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
# Completa los passwords y vuelve a ejecutar ./scripts/deploy-becam.sh

# Postgres (para la aplicación)
DATABASE_HOST=localhost
DATABASE_PORT=5432
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

  DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
  DATABASE_ADMIN_URL="postgresql://${DATABASE_ADMIN_USER}:${DATABASE_ADMIN_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/postgres"
}

# ---------------------------------------------------------------------------
# Ensure database exists
# ---------------------------------------------------------------------------
ensure_database_exists() {
  if ! command -v psql >/dev/null 2>&1; then
    err "psql no está instalado. Crea la base de datos manualmente:"
    echo "  CREATE DATABASE \"${DATABASE_NAME}\";"
    exit 1
  fi

  log "Verificando base de datos ${DATABASE_NAME}..."
  local exists
  exists=$(PGPASSWORD="${DATABASE_ADMIN_PASSWORD}" psql \
    "${DATABASE_ADMIN_URL}" \
    -tc "SELECT 1 FROM pg_database WHERE datname='${DATABASE_NAME}';" 2>/dev/null | tr -d ' \n' || true)

  if [ "${exists}" = "1" ]; then
    ok "Base de datos ${DATABASE_NAME} ya existe"
  else
    warn "Creando base de datos ${DATABASE_NAME}..."
    PGPASSWORD="${DATABASE_ADMIN_PASSWORD}" psql \
      "${DATABASE_ADMIN_URL}" \
      -c "CREATE DATABASE \"${DATABASE_NAME}\";" >/dev/null 2>&1 || {
        err "No se pudo crear la base de datos."
        echo "Verifica que ${DATABASE_ADMIN_USER} tenga permisos de CREATE DATABASE y que el password sea correcto."
        exit 1
      }
    ok "Base de datos ${DATABASE_NAME} creada"
  fi
}

# ---------------------------------------------------------------------------
# Generate .env
# ---------------------------------------------------------------------------
ensure_env() {
  if [ -f ".env" ]; then
    ok ".env ya existe, no se modifica"
    return 0
  fi

  log "Generando .env..."

  if [ ! -f ".env.becam.example" ]; then
    err "No se encontró .env.becam.example"
    exit 1
  fi

  # Generate secure secrets
  CRYPTO_KEY_BASE64=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

  # Start from the Becam template and replace the fixed + secret values
  sed \
    -e "s|^APP_HOST=.*|APP_HOST=${APP_HOST}|" \
    -e "s|^APP_PORT=.*|APP_PORT=${APP_PORT}|" \
    -e "s|^ADMIN_WEB_URL=.*|ADMIN_WEB_URL=${ADMIN_WEB_URL}|" \
    -e "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" \
    -e "s|^CRYPTO_KEY_BASE64=.*|CRYPTO_KEY_BASE64=${CRYPTO_KEY_BASE64}|" \
    -e "s|^CSRF_SECRET=.*|CSRF_SECRET=${CSRF_SECRET}|" \
    -e "s|^ADMIN_EMAIL=.*|ADMIN_EMAIL=${ADMIN_EMAIL}|" \
    -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASSWORD}|" \
    -e "s|^RUN_WORKERS_IN_WEB=.*|RUN_WORKERS_IN_WEB=false|" \
    .env.becam.example > .env

  chmod 600 .env
  ok ".env generado en $(pwd)/.env"
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
  SKIP_NEXT_VALIDATION=1 npm run build:admin-web

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

  if curl -fsS "http://127.0.0.1:${ADMIN_WEB_PORT}/api/health" >/dev/null 2>&1; then
    ok "Admin-web /api/health responde en puerto ${ADMIN_WEB_PORT}"
    web_ok=true
  else
    err "Admin-web /api/health NO responde en puerto ${ADMIN_WEB_PORT}"
  fi

  if [ "$api_ok" = true ] && [ "$web_ok" = true ]; then
    ok "Smoke exitoso"
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
