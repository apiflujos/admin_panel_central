#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://app.olivashoes.com}"
BASE_URL="${BASE_URL%/}"
TENANT_ID="${TENANT_ID:-}"
TOKEN="${TOKEN:-}"
LIMIT="${LIMIT:-5}"

if [[ -z "$TOKEN" ]]; then
  echo "TOKEN no definido. Exporta TOKEN y TENANT_ID (si aplica) y reintenta."
  exit 1
fi

header_args=()
if [[ -n "$TENANT_ID" ]]; then
  header_args+=(-H "x-tenant-id: ${TENANT_ID}")
fi
header_args+=(-H "Authorization: Bearer ${TOKEN}")

report="/tmp/qa_orders_billing_$(date +%Y%m%d_%H%M%S).log"
touch "$report"

request_json() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local tmp
  tmp="$(mktemp)"
  local code
  if [[ -n "$data" ]]; then
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      "${header_args[@]}" \
      -d "$data")"
  else
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" \
      "${header_args[@]}")"
  fi
  echo "$code"
  cat "$tmp"
  rm -f "$tmp"
}

run_step() {
  local name="$1"
  local method="$2"
  local url="$3"
  local data="${4:-}"

  {
    echo "== $name =="
    echo "URL: $url"
  } >> "$report"

  local output
  output="$(request_json "$method" "$url" "$data")"
  local code
  code="$(echo "$output" | head -n 1)"
  local body
  body="$(echo "$output" | tail -n +2)"

  local status="FAIL"
  if [[ "$code" =~ ^2 ]]; then
    status="OK"
  fi

  {
    echo "HTTP: $code ($status)"
    echo "Body (primeros 2000 chars):"
    echo "${body:0:2000}"
    echo ""
  } >> "$report"

  echo "$name -> $status (HTTP $code)"
}

echo "QA Orders/Billing @ $BASE_URL" >> "$report"
echo "Tenant: ${TENANT_ID:-<no-tenant>}" >> "$report"
echo "Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$report"
echo "" >> "$report"

run_step "Health" "GET" "${BASE_URL}/api/health"
run_step "Sync pedidos (Shopify -> Alegra)" "POST" "${BASE_URL}/api/orders/sync" \
  "{\"filters\":{\"limit\":${LIMIT}}}"
run_step "Backfill pedidos (Shopify -> DB)" "POST" "${BASE_URL}/api/orders/backfill" \
  "{\"source\":\"shopify\",\"limit\":${LIMIT}}"
run_step "Backfill productos (Alegra -> DB)" "POST" "${BASE_URL}/api/products/backfill" \
  "{\"source\":\"alegra\",\"limit\":${LIMIT}}"

echo ""
echo "Reporte: $report"
