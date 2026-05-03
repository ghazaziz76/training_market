#!/bin/bash
set -e

APP_DIR="/opt/training-market"
echo "=== DEPLOYING TRAINING MARKET ==="
echo "Started at: $(date)"

# 1. Start database containers
echo ">>> Starting Docker containers..."
cd $APP_DIR
docker compose -f deploy/docker-compose.prod.yml up -d
echo "Waiting for Postgres to be ready..."
sleep 10
docker exec tm-postgres pg_isready -U tm_admin -d training_market

# 2. Install dependencies
echo ">>> Installing dependencies..."
cd $APP_DIR
pnpm install --frozen-lockfile --prod=false

# 3. Generate Prisma client
echo ">>> Generating Prisma client..."
cd $APP_DIR/apps/api
npx prisma generate

# 4. Run database migrations
echo ">>> Running database migrations..."
cd $APP_DIR/apps/api
npx prisma migrate deploy

# 5. Build API
echo ">>> Building API..."
cd $APP_DIR
pnpm build:api

# 6. Build Web
echo ">>> Building Web frontend..."
cd $APP_DIR
pnpm build:web

# 7. Create PM2 log directory
mkdir -p /var/log/pm2

# 8. Start/restart apps with PM2
echo ">>> Starting apps with PM2..."
cd $APP_DIR
pm2 delete all 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

# 9. Verify
echo ""
echo ">>> Checking status..."
sleep 5
pm2 status
echo ""
curl -s http://localhost:4000/api/health 2>/dev/null && echo " API OK" || echo "API not responding yet (may need a moment)"
curl -s http://localhost:3000 >/dev/null 2>&1 && echo "Web OK" || echo "Web not responding yet (may need a moment)"

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Finished at: $(date)"
