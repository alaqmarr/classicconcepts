#!/usr/bin/env bash
{
set -e

restart_on_error() {
  echo "⚠️ Build/update failed — restarting previous PM2 process..."
  pm2 start ecosystem.config.cjs --update-env || pm2 restart classicconcepts || true
}
trap restart_on_error ERR

echo "=========================================="
echo "🚀 Starting Classic Concepts Update..."
echo "=========================================="

# 1. Pull latest code & install dependencies BEFORE stopping live site
echo "📦 Pulling latest code from Git..."
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  git stash push -m "pre-update-$(date +%Y%m%d_%H%M%S)" || true
fi
git pull --ff-only || git pull

echo "📥 Installing dependencies..."
npm install --no-audit --no-fund --legacy-peer-deps

echo "🗄️ Syncing Prisma schema and indexes..."
npx prisma db push
npx prisma generate

# 2. Stop live PM2 process briefly for clean SQLite WAL checkpoint & low-RAM build
if pm2 describe classicconcepts > /dev/null 2>&1; then
  echo "⏸️ Stopping running PM2 process before build..."
  pm2 stop classicconcepts || true
fi

# 3. Safe SQLite WAL-aware backup (keep latest 3 backups)
if [ -f "dev.db" ]; then
  BACKUP_NAME="dev.db.backup.$(date +%Y%m%d_%H%M%S)"
  node -e "
    const Database = require('better-sqlite3');
    const db = new Database('dev.db');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.backup('$BACKUP_NAME').then(() => db.close()).catch((err) => { console.error(err); process.exit(1); });
  " || cp dev.db "$BACKUP_NAME"
  echo "✅ Backed up dev.db to $BACKUP_NAME"
  ls -1t dev.db.backup.* 2>/dev/null | tail -n +4 | xargs -r rm -f || true
fi

# 4. Wipe old .next build & build cleanly
echo "🧹 Cleaning previous .next build artifacts..."
rm -rf .next

echo "🏗️ Building Next.js production app (memory-safe mode)..."
NODE_OPTIONS="--max-old-space-size=1024" npm run build

# 5. Start fresh PM2 process on configured port (default 3003)
trap - ERR
echo "🔄 Starting PM2 process (classicconcepts)..."
pm2 flush classicconcepts || true
if pm2 describe classicconcepts > /dev/null 2>&1; then
  pm2 delete classicconcepts || true
fi
pm2 start ecosystem.config.cjs --update-env
pm2 save

APP_PORT=$(node -e "console.log(require('./ecosystem.config.cjs').apps[0].env.PORT)")
echo "⏳ Verifying server health on port ${APP_PORT}..."
sleep 3
if curl -sSf -o /dev/null "http://127.0.0.1:${APP_PORT}"; then
  echo "✅ Server is live and responding (HTTP 200) on port ${APP_PORT}!"
else
  echo "⚠️ Health check did not immediately return 200; recent PM2 logs:"
  pm2 logs classicconcepts --lines 30 --nostream || true
fi

echo "=========================================="
echo "✅ Classic Concepts updated & restarted!"
echo "=========================================="
exit 0
}
