#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Starting Classic Concepts Update..."
echo "=========================================="

# 1. Backup SQLite database if present & prune old backups (keep latest 3)
if [ -f "dev.db" ]; then
  BACKUP_NAME="dev.db.backup.$(date +%Y%m%d_%H%M%S)"
  cp dev.db "$BACKUP_NAME"
  echo "✅ Backed up dev.db to $BACKUP_NAME"
  ls -1t dev.db.backup.* 2>/dev/null | tail -n +4 | xargs -r rm -f || true
fi

# 2. Stash local changes & pull latest code
echo "📦 Stashing local changes and pulling latest code..."
git stash
git pull

# 3. Install dependencies
echo "📥 Installing dependencies..."
npm i --legacy-peer-deps

# 4. Sync Prisma schema & generate Prisma client
echo "🗄️ Syncing Prisma schema and generating client..."
npx prisma db push
npx prisma generate

# 5. Build Next.js production bundle with bounded V8 heap to prevent build-time OOM
echo "🏗️ Building Next.js production app (memory-safe mode)..."
NODE_OPTIONS="--max-old-space-size=1024" npm run build

# 6. Restart PM2 process using memory-managed ecosystem.config.cjs
echo "🔄 Restarting PM2 process (classicconcepts)..."
if pm2 describe classicconcepts > /dev/null 2>&1; then
  pm2 delete classicconcepts
fi
pm2 start ecosystem.config.cjs --update-env
pm2 save

echo "=========================================="
echo "✅ Classic Concepts updated & restarted!"
echo "=========================================="
