#!/usr/bin/env bash
#
# Deploy script for admin_panel_central (client/becam).
#
# Usage:
#   cd /srv/apiflujos/becam/admin_panel_central
#   APP_HOST=https://admin-becam.ejemplo.com \
#   DATABASE_URL=postgresql://user:pass@host:5432/admin-central-becam \
#   ADMIN_EMAIL=admin@becam.com \
#   ADMIN_PASSWORD='Str0ngP@ss' \
#     ./scripts/deploy.sh
#
# On first run the script generates a .env file from the exported variables.
# On later runs it keeps the existing .env and only pulls, builds, migrates and
# reloads the PM2 process.
#
# The database must already exist; migrations are applied with npm run db:migrate.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REQUIRED_BRANCH="client/becam"
APP_NAME="admin-central-becam"

echo -e "${BLUE}=== Deploy ${APP_NAME} ===${NC}"

# ---------------------------------------------------------------------------
# 0. Preconditions
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}Error: node no está instalado${NC}"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}Error: npm no está instalado${NC}"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo -e "${RED}Error: pm2 no está instalado. Instálalo con: npm i -g pm2${NC}"
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: No se encontró package.json. Ejecuta este script desde la raíz del proyecto.${NC}"
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. Ensure correct branch
# ---------------------------------------------------------------------------
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "${CURRENT_BRANCH}" != "${REQUIRED_BRANCH}" ]; then
  echo -e "${RED}Error: Debes estar en la branch ${REQUIRED_BRANCH}. Actual: ${CURRENT_BRANCH}${NC}"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Pull latest code
# ---------------------------------------------------------------------------
echo -e "${YELLOW}→ Pull de origin/${REQUIRED_BRANCH}...${NC}"
git pull origin "${REQUIRED_BRANCH}"

# ---------------------------------------------------------------------------
# 3. Install dependencies
# ---------------------------------------------------------------------------
echo -e "${YELLOW}→ Instalando dependencias (npm ci)...${NC}"
npm ci

# ---------------------------------------------------------------------------
# 4. Generate .env if missing
# ---------------------------------------------------------------------------
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}→ .env no existe. Generando a partir de variables de entorno...${NC}"

  # Required values (script fails fast with a clear message)
  : "${APP_HOST:?Variable APP_HOST no definida. Ej: https://admin-becam.ejemplo.com}"
  : "${DATABASE_URL:?Variable DATABASE_URL no definida. Ej: postgresql://user:pass@host:5432/admin-central-becam}"
  : "${ADMIN_EMAIL:?Variable ADMIN_EMAIL no definida}"
  : "${ADMIN_PASSWORD:?Variable ADMIN_PASSWORD no definida}"

  # Optional values with sensible defaults
  APP_PORT="${APP_PORT:-3001}"
  REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
  NODE_ENV="${NODE_ENV:-production}"
  SHOPIFY_API_VERSION="${SHOPIFY_API_VERSION:-2024-10}"
  SHOPIFY_API_VERSION_MARKETING="${SHOPIFY_API_VERSION_MARKETING:-2024-10}"
  ALEGRA_TIMEOUT_MS="${ALEGRA_TIMEOUT_MS:-30000}"
  BILLING_REPORT_ENABLED="${BILLING_REPORT_ENABLED:-true}"
  BILLING_REPORT_CRON="${BILLING_REPORT_CRON:-5 0 1 * *}"
  BILLING_REPORT_TZ="${BILLING_REPORT_TZ:-America/Bogota}"
  METRICS_MAX_PAGES="${METRICS_MAX_PAGES:-10}"
  METRICS_TIMEOUT_MS="${METRICS_TIMEOUT_MS:-8000}"
  METRICS_SHOPIFY_MAX_ORDERS="${METRICS_SHOPIFY_MAX_ORDERS:-500}"
  METRICS_INVENTORY_SALES_DAYS="${METRICS_INVENTORY_SALES_DAYS:-30}"
  MARKETING_ENABLED="${MARKETING_ENABLED:-true}"
  SHOPIFY_RL_MAX_PER_SEC="${SHOPIFY_RL_MAX_PER_SEC:-6}"
  SHOPIFY_RL_MAX_WAIT_MS="${SHOPIFY_RL_MAX_WAIT_MS:-15000}"
  MARKETING_SYNC_MAX_ORDERS="${MARKETING_SYNC_MAX_ORDERS:-1500}"
  MARKETING_CRON_SYNC="${MARKETING_CRON_SYNC:-0 2 * * *}"
  MARKETING_CRON_METRICS="${MARKETING_CRON_METRICS:-30 2 * * *}"
  MARKETING_CRON_ALERTS="${MARKETING_CRON_ALERTS:-0 3 * * *}"
  MARKETING_CRON_ADS="${MARKETING_CRON_ADS:-15 2 * * *}"
  MARKETING_WORKER_CONCURRENCY="${MARKETING_WORKER_CONCURRENCY:-3}"
  OPENAI_MODEL="${OPENAI_MODEL:-gpt-4o-mini}"
  ALEGRA_VARIANT_ATTRIBUTE_NAME="${ALEGRA_VARIANT_ATTRIBUTE_NAME:-Talla}"

  # Generate secure secrets
  CRYPTO_KEY_BASE64=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

  cat > .env <<EOF
# --- Core / server ---
NODE_ENV=${NODE_ENV}
APP_PORT=${APP_PORT}
APP_HOST=${APP_HOST}
APP_ORG_ID=1

# --- Database ---
DATABASE_URL=${DATABASE_URL}
DATABASE_SSL=
DB_POOL_MAX=5
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
DB_APP_NAME=${APP_NAME}
MIM_DATABASE_URL=
MIM_DATABASE_SSL=

# --- Security ---
CRYPTO_KEY_BASE64=${CRYPTO_KEY_BASE64}
CSRF_SECRET=${CSRF_SECRET}

# --- Admin auth ---
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# --- Shopify OAuth / API ---
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=read_orders,write_orders,read_products,write_products,read_customers,write_customers,read_inventory,write_inventory,write_webhooks
SHOPIFY_WEBHOOK_SECRET=
SHOPIFY_API_VERSION=${SHOPIFY_API_VERSION}
SHOPIFY_VENDOR=

# --- Alegra ---
ALEGRA_TIMEOUT_MS=${ALEGRA_TIMEOUT_MS}

# --- Sync pollers ---
ORDERS_SYNC_POLL_SECONDS=300
ORDERS_SYNC_POLL_MS=
ORDERS_SYNC_BATCH_SIZE=50
ORDERS_SYNC_MAX_ORDERS=100
ORDERS_SYNC_LOOKBACK_MINUTES=60

PRODUCTS_SYNC_POLL_SECONDS=300
PRODUCTS_SYNC_POLL_MS=
PRODUCTS_SYNC_BATCH_SIZE=50
PRODUCTS_SYNC_BATCH_LIMIT=100
PRODUCTS_SYNC_LOOKBACK_MINUTES=60

RETRY_QUEUE_POLL_MS=60000
RETRY_QUEUE_MAX_RETRIES=5
RETRY_QUEUE_BASE_DELAY_SEC=60

# --- Inventory adjustments ---
INVENTORY_ADJUSTMENTS_POLL_DISABLED=

# --- Billing report ---
BILLING_REPORT_ENABLED=${BILLING_REPORT_ENABLED}
BILLING_REPORT_CRON=${BILLING_REPORT_CRON}
BILLING_REPORT_TZ=${BILLING_REPORT_TZ}
BILLING_REPORT_TO=
BILLING_REPORT_WEBHOOK_URL=

# --- Metrics ---
METRICS_MAX_PAGES=${METRICS_MAX_PAGES}
METRICS_TIMEOUT_MS=${METRICS_TIMEOUT_MS}
METRICS_SHOPIFY_MAX_ORDERS=${METRICS_SHOPIFY_MAX_ORDERS}
METRICS_INVENTORY_SALES_DAYS=${METRICS_INVENTORY_SALES_DAYS}

# --- Marketing & Analytics ---
MARKETING_ENABLED=${MARKETING_ENABLED}
REDIS_URL=${REDIS_URL}
MARKETING_PIXEL_KEY=
SHOPIFY_RL_MAX_PER_SEC=${SHOPIFY_RL_MAX_PER_SEC}
SHOPIFY_RL_MAX_WAIT_MS=${SHOPIFY_RL_MAX_WAIT_MS}
MARKETING_SYNC_MAX_ORDERS=${MARKETING_SYNC_MAX_ORDERS}
MARKETING_CRON_SYNC=${MARKETING_CRON_SYNC}
MARKETING_CRON_METRICS=${MARKETING_CRON_METRICS}
MARKETING_CRON_ALERTS=${MARKETING_CRON_ALERTS}
MARKETING_CRON_ADS=${MARKETING_CRON_ADS}
MARKETING_WORKER_CONCURRENCY=${MARKETING_WORKER_CONCURRENCY}
SHOPIFY_API_VERSION_MARKETING=${SHOPIFY_API_VERSION_MARKETING}

# --- MongoDB ---
MONGO_URL=
MONGO_DB_NAME=

# --- Webhooks ---
ALEGRA_WEBHOOK_SECRET=
ALLOW_UNVERIFIED_SHOPIFY_WEBHOOKS=

# --- AI Assistant ---
OPENAI_MODEL=${OPENAI_MODEL}

# --- Scripts only (CLI helpers) ---
WEBHOOK_BASE_URL=
BASE_URL=
QA_TOKEN=
SHOPIFY_DOMAIN=
SHOPIFY_ACCESS_TOKEN=
SHOP_DOMAIN=

ALEGRA_EMAIL=
ALEGRA_API_KEY=
ALEGRA_WAREHOUSE_ID=
ALEGRA_TAX_ID=
ALEGRA_PRICE_LIST_ID=
ALEGRA_UNIT=
ALEGRA_ITEM_ID=
ALEGRA_QTY=
ALEGRA_UNIT_COST=
ALEGRA_IMAGE_URL=
ALEGRA_REFERENCE=
ALEGRA_ITEMS_JSON=
ALEGRA_VARIANT_ATTRIBUTE_ID=
ALEGRA_VARIANT_ATTRIBUTE_NAME=${ALEGRA_VARIANT_ATTRIBUTE_NAME}
EOF

  chmod 600 .env
  echo -e "${GREEN}✓ .env generado en $(pwd)/.env${NC}"
else
  echo -e "${GREEN}✓ .env ya existe, no se modifica${NC}"
fi

# ---------------------------------------------------------------------------
# 5. Build
# ---------------------------------------------------------------------------
echo -e "${YELLOW}→ Compilando TypeScript...${NC}"
npm run build

# ---------------------------------------------------------------------------
# 6. Database migrations
# ---------------------------------------------------------------------------
echo -e "${YELLOW}→ Ejecutando migraciones...${NC}"
npm run db:migrate

# ---------------------------------------------------------------------------
# 7. PM2 start or reload
# ---------------------------------------------------------------------------
echo -e "${YELLOW}→ Gestionando proceso PM2 (${APP_NAME})...${NC}"
if pm2 list 2>/dev/null | grep -q "${APP_NAME}"; then
  pm2 reload "${APP_NAME}"
else
  pm2 start dist/server.js --name "${APP_NAME}" --env production
fi

pm2 save || true

echo ""
echo -e "${GREEN}=== Despliegue completado ===${NC}"
echo -e "Proceso: ${APP_NAME}"
echo -e "Puerto:  $(grep '^APP_PORT=' .env | cut -d= -f2)"
echo -e "Host:    $(grep '^APP_HOST=' .env | cut -d= -f2)"
echo ""
echo -e "Comandos útiles:"
echo -e "  pm2 logs ${APP_NAME}"
echo -e "  pm2 status"
echo -e "  pm2 restart ${APP_NAME}"
