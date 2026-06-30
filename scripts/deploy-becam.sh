#!/usr/bin/env bash
# Deploy + rollback para el cliente becam (rama client/becam).
#
# Uso:
#   ./scripts/deploy-becam.sh              # deploy normal
#   ./scripts/deploy-becam.sh rollback <COMMIT>
#   ./scripts/deploy-becam.sh smoke        # solo smoke
#
# Requisitos:
#   - PM2 instalado globalmente
#   - .env existe en el directorio del proyecto
#   - rama client/becam checkout
#   - usuario con permisos para escribir en logs/ y dist/

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

LOG_DIR="$APP_DIR/logs"
mkdir -p "$LOG_DIR"

EXPECTED_BRANCH="client/becam"
ECOSYSTEM_FILE="$APP_DIR/ecosystem.config.js"
HEALTH_API="http://localhost:3007/health"
HEALTH_WEB="http://localhost:3200/api/health"

log() {
  printf '\n\033[1;36m==> %s\033[0m\n' "$*"
}

err() {
  printf '\n\033[1;31m!! %s\033[0m\n' "$*" >&2
}

ok() {
  printf '\033[1;32m✓ %s\033[0m\n' "$*"
}

ensure_branch() {
  local current
  current="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$current" != "$EXPECTED_BRANCH" ]]; then
    err "Rama actual: $current. Esperada: $EXPECTED_BRANCH. Aborto."
    exit 1
  fi
}

ensure_env() {
  if [[ ! -f "$APP_DIR/.env" ]]; then
    err ".env no existe en $APP_DIR. Copia .env.becam.example a .env y configúralo."
    exit 1
  fi
}

run_smoke() {
  local fail=0
  log "Smoke: backend $HEALTH_API"
  if curl -fsS -m 8 "$HEALTH_API" > /dev/null; then
    ok "Backend respondió 200"
  else
    err "Backend NO respondió en $HEALTH_API"
    fail=1
  fi
  log "Smoke: admin-web $HEALTH_WEB"
  if curl -fsS -m 8 "$HEALTH_WEB" > /dev/null; then
    ok "Admin-web respondió 200"
  else
    err "Admin-web NO respondió en $HEALTH_WEB"
    fail=1
  fi
  if [[ $fail -ne 0 ]]; then
    err "Smoke fallido. Revisa: pm2 logs"
    exit 1
  fi
}

action_deploy() {
  ensure_branch
  ensure_env
  local from_commit
  from_commit="$(git rev-parse HEAD)"
  log "Commit actual: $from_commit"

  log "git fetch + pull"
  git fetch origin "$EXPECTED_BRANCH"
  git pull --ff-only origin "$EXPECTED_BRANCH"

  log "npm ci (backend)"
  npm ci --no-audit --no-fund

  log "npm ci (admin-web)"
  npm ci --prefix apps/admin-web --no-audit --no-fund

  log "npm run build (backend)"
  npm run build

  log "npm run build:admin-web"
  SKIP_NEXT_VALIDATION=1 npm run build:admin-web

  log "npm run db:migrate"
  npm run db:migrate

  log "PM2 reload $ECOSYSTEM_FILE"
  pm2 reload "$ECOSYSTEM_FILE" --update-env

  log "PM2 save"
  pm2 save

  sleep 4
  run_smoke

  ok "Deploy completado desde $from_commit hasta $(git rev-parse HEAD)"
}

action_rollback() {
  local target="${1:-}"
  if [[ -z "$target" ]]; then
    err "Uso: $0 rollback <COMMIT>"
    exit 1
  fi
  ensure_branch
  ensure_env

  log "Rollback hacia $target"
  git fetch origin
  git checkout "$target"

  log "npm ci + build"
  npm ci --no-audit --no-fund
  npm ci --prefix apps/admin-web --no-audit --no-fund
  npm run build
  SKIP_NEXT_VALIDATION=1 npm run build:admin-web

  log "PM2 reload $ECOSYSTEM_FILE"
  pm2 reload "$ECOSYSTEM_FILE" --update-env

  sleep 4
  run_smoke
  ok "Rollback completado a $target. RECUERDA: estás en HEAD detached, abre PR si lo dejas así."
}

main() {
  local cmd="${1:-deploy}"
  case "$cmd" in
    deploy)
      action_deploy
      ;;
    rollback)
      action_rollback "${2:-}"
      ;;
    smoke)
      run_smoke
      ;;
    *)
      err "Comando desconocido: $cmd"
      printf 'Uso:\n  %s            # deploy\n  %s rollback <COMMIT>\n  %s smoke\n' "$0" "$0" "$0"
      exit 1
      ;;
  esac
}

main "$@"
