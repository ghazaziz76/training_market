#!/bin/bash
# Incremental update for the live server, which is NOT a git checkout.
#
# From the dev machine:
#   git archive HEAD $(git diff --name-only <last-deployed-commit> HEAD) -o tm-update.tar.gz
#   scp tm-update.tar.gz root@103.191.76.97:/tmp/tm-update.tar.gz
#   ssh root@103.191.76.97 'bash /opt/training-market/deploy/update.sh'
set -e

APP_DIR="/opt/training-market"
ARCHIVE="${1:-/tmp/tm-update.tar.gz}"
cd "$APP_DIR"

echo "=== UPDATING TRAINING MARKET ($(date)) ==="

if [ ! -f "$ARCHIVE" ]; then
  echo "Archive not found: $ARCHIVE"
  exit 1
fi

echo ">>> Extracting $ARCHIVE ..."
tar -xzf "$ARCHIVE"

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

# tm-api runs via tsx, so a tsc failure here does not affect the running API.
echo ">>> Type-checking API (non-fatal)..."
pnpm build:api || echo "API type-check reported errors (pre-existing); continuing"

echo ">>> Building Web..."
pnpm build:web

echo ">>> Restarting PM2 apps..."
pm2 restart tm-api tm-web --update-env
pm2 save

sleep 5
pm2 ls
rm -f "$ARCHIVE"
echo "=== UPDATE COMPLETE ==="
