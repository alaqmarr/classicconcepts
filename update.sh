#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Starting Classic Concepts Update..."
echo "=========================================="

# 1. Stop live PM2 process before backup & build so SQLite WAL checkpoints cleanly
#    and `next build` gets full available VPS RAM without competing with Node.js.
if pm2 describe classicconcepts > /dev/null 2>&1; then
  echo "⏸️ Stopping running PM2 process before build..."
  pm2 stop classicconcepts || true
fi

# 2. Safe SQLite WAL-aware backup (keep latest 3 backups)
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

# 3. Pull latest code (preserving untracked dev.db & uploads)
echo "📦 Pulling latest code from Git..."
git stash --include-untracked=false || true
git pull --ff-only || git pull

# 4. Install dependencies cleanly
echo "📥 Installing dependencies..."
npm install --no-audit --no-fund --legacy-peer-deps

# 5. Sync Prisma schema & regenerate Prisma client
echo "🗄️ Syncing Prisma schema and indexes..."
npx prisma db push
npx prisma generate

# 6. Wipe old .next build (eliminates stale .next/server/edge chunks) & build cleanly
echo "🧹 Cleaning previous .next build artifacts..."
rm -rf .next

echo "🏗️ Building Next.js production app (memory-safe mode)..."
NODE_OPTIONS="--max-old-space-size=1024" npm run build

# 7. Flush old PM2 error logs & start fresh process from ecosystem.config.cjs
echo "🔄 Starting PM2 process (classicconcepts)..."
pm2 flush classicconcepts || true
if pm2 describe classicconcepts > /dev/null 2>&1; then
  pm2 delete classicconcepts || true
fi
pm2 start ecosystem.config.cjs --update-env
pm2 save

echo "=========================================="
echo "✅ Classic Concepts updated & restarted!"
echo "=========================================="
