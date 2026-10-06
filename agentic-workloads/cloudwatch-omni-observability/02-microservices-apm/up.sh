#!/usr/bin/env bash
# Start the shop and the collector. The collector signs requests with credentials
# exported from your current AWS CLI session. They're short-lived: when they
# expire, re-run ./up.sh.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/.." && pwd)"
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a
: "${AWS_REGION:?set AWS_REGION in .env}"

eval "$(aws configure export-credentials --format env)"
cd "$HERE"
docker compose --env-file "$ROOT/.env" up -d --build "$@"
echo
echo "frontend http://localhost:8000   orders http://localhost:8001   payments http://localhost:8002"
echo "collector logs:  docker compose logs -f otel-collector"
