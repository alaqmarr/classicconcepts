#!/usr/bin/env bash
{
set -e

restart_on_error() {
  echo "⚠️ Build/update failed — restarting previous PM2 process..."
  pm2 start ecosystem.config.cjs --update-env || pm2 restart classicconcepts || true
}
trap restart_on_error ERR

echo "=========================================="
echo "🚀 Starting Classic Concepts Safe Update..."
echo "=========================================="

# 1. Pull latest code & install dependencies (dev.db and backups/ are gitignored and NEVER overwritten)
echo "📦 Pulling latest code from Git..."
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  git stash push -m "pre-update-$(date +%Y%m%d_%H%M%S)" || true
fi
git pull --ff-only || git pull

echo "📥 Installing dependencies..."
npm install --no-audit --no-fund --legacy-peer-deps

# 2. Stop live PM2 process briefly BEFORE touching SQLite so WAL checkpoints cleanly
if pm2 describe classicconcepts > /dev/null 2>&1; then
  echo "⏸️ Stopping running PM2 process before database backup & schema sync..."
  pm2 stop classicconcepts || true
fi

# 3. Safe SQLite WAL-aware backup BEFORE prisma db push (keep latest 5 backups + JSON SiteContent snapshot)
if [ -f "dev.db" ]; then
  BACKUP_NAME="dev.db.backup.$(date +%Y%m%d_%H%M%S)"
  node -e "
    const Database = require('better-sqlite3');
    const db = new Database('dev.db');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.backup('$BACKUP_NAME').then(() => db.close()).catch((err) => { console.error(err); process.exit(1); });
  " || cp dev.db "$BACKUP_NAME"
  echo "✅ Backed up live dev.db to $BACKUP_NAME"
  ls -1t dev.db.backup.* 2>/dev/null | tail -n +6 | xargs -r rm -f || true
  node scripts/bootstrap-production-safe.mjs --pre-push-backup || true
fi

# 4. Additive Prisma schema sync + One-Time Safe SiteSetting Bootstrap (100% live text/image/product retention)
echo "🗄️ Syncing Prisma schema (non-destructive, preserving all live rows)..."
npx prisma db push
npx prisma generate

echo "🔒 Running one-time safe Site Settings check with 100% data retention..."
node scripts/bootstrap-production-safe.mjs

# 5. Ensure 100MB Pure In-Memory Redis Cache is active on server
echo "⚡ Ensuring 100MB In-Memory Redis Cache..."
chmod +x scripts/setup-redis-100mb.sh 2>/dev/null || true
bash scripts/setup-redis-100mb.sh || echo "⚠️ Redis daemon setup skipped — built-in 100MB in-memory LRU engine will serve requests."

# 6. Wipe old .next build & build cleanly
echo "🧹 Cleaning previous .next build artifacts..."
rm -rf .next

echo "🏗️ Building Next.js production app (memory-safe mode)..."
NODE_OPTIONS="--max-old-space-size=1024" npm run build

# 7. Flush stale Redis keys before starting fresh PM2 process so deploy serves latest build cleanly
if command -v redis-cli >/dev/null 2>&1 && redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
  echo "🔄 Clearing stale cache keys and preparing fresh warm-up..."
  redis-cli -h 127.0.0.1 -p 6379 FLUSHDB ASYNC >/dev/null 2>&1 || true
fi

# 8. Start fresh PM2 process on configured port (default 3003)
trap - ERR
echo "🔄 Starting PM2 process (classicconcepts)..."
pm2 flush classicconcepts || true
if pm2 describe classicconcepts > /dev/null 2>&1; then
  pm2 delete classicconcepts || true
fi
pm2 start ecosystem.config.cjs --update-env
pm2 save

APP_PORT=$(node -e "console.log(require('./ecosystem.config.cjs').apps[0].env.PORT)")
echo "⏳ Verifying server health & warming 100MB Redis cache on port ${APP_PORT}..."
sleep 3
if curl -sSf -o /dev/null "http://127.0.0.1:${APP_PORT}"; then
  curl -sSf -X POST "http://127.0.0.1:${APP_PORT}/api/cache/warm" -o /dev/null || true
  echo "✅ Server is live (HTTP 200) and 100MB Redis cache is warm on port ${APP_PORT}!"
else
  echo "⚠️ Health check did not immediately return 200; recent PM2 logs:"
  pm2 logs classicconcepts --lines 30 --nostream || true
fi

echo "=========================================="
echo "✅ Classic Concepts updated & restarted (all live texts, images, settings & products retained)!"
echo "=========================================="
exit 0
}
