#!/bin/bash
# Incremental update for an already-provisioned server.
# Usage (on the VPS): bash /opt/training-market/deploy/update.sh
set -e

APP_DIR="/opt/training-market"
cd "$APP_DIR"

echo "=== UPDATING TRAINING MARKET ($(date)) ==="

echo ">>> Pulling latest code (local server tweaks are auto-stashed and re-applied)..."
git pull --autostash

echo ">>> Installing dependencies..."
pnpm install --frozen-lockfile --prod=false

echo ">>> Loading environment..."
set -a
. "$APP_DIR/.env"
set +a

echo ">>> Prisma generate + migrate..."
cd "$APP_DIR/apps/api"
npx prisma generate
npx prisma migrate deploy
cd "$APP_DIR"

echo ">>> Building API and Web..."
pnpm build:api
pnpm build:web

echo ">>> Restarting PM2 apps..."
pm2 restart tm-api tm-web --update-env
pm2 save

sleep 5
pm2 ls
curl -s -o /dev/null -w "API health: %{http_code}\n" http://localhost:4000/api/health || true
echo "=== UPDATE COMPLETE ==="
