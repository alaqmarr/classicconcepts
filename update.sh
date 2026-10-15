#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Starting Classic Concepts Update..."
echo "=========================================="

# 1. Backup SQLite database if present (safety net)
if [ -f "dev.db" ]; then
  BACKUP_NAME="dev.db.backup.$(date +%Y%m%d_%H%M%S)"
  cp dev.db "$BACKUP_NAME"
  echo "✅ Backed up dev.db to $BACKUP_NAME"
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

# 5. Build Next.js production bundle
echo "🏗️ Building Next.js production app..."
npm run build

# 6. Restart PM2 process
echo "🔄 Restarting PM2 process (classicconcepts)..."
if pm2 describe classicconcepts > /dev/null 2>&1; then
  pm2 restart classicconcepts --update-env
else
  pm2 start npm --name "classicconcepts" -- start
fi
pm2 save

echo "=========================================="
echo "✅ Classic Concepts updated & restarted!"
echo "=========================================="
