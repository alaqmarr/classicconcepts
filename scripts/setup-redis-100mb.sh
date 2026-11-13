#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Classic Concepts - 100MB Pure In-Memory Redis Cache Setup
# Configures local redis-server strictly at 100 MB (104,857,600 bytes) RAM,
# allkeys-lru eviction, and zero disk persistence (save "", appendonly no)
# for sub-millisecond client page & ACRIO AI cache performance.
# ==============================================================================

MAX_BYTES=104857600 # 100 * 1024 * 1024 (100 MB exact)

echo "⚡ Configuring 100MB In-Memory Redis Cache for Classic Concepts..."

SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
fi

# 1. Install redis-server if missing on Linux server
if ! command -v redis-server >/dev/null 2>&1; then
  echo "📦 Installing redis-server..."
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -qq
    DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq redis-server
  elif command -v dnf >/dev/null 2>&1; then
    $SUDO dnf install -y redis
  elif command -v yum >/dev/null 2>&1; then
    $SUDO yum install -y redis
  else
    echo "⚠️ Package manager not detected. App will automatically use its built-in 100MB LRU memory engine."
    exit 0
  fi
fi

# 2. Write dedicated 100MB pure in-memory config snippet
CONF_SNIPPET="/etc/redis/classicconcepts-100mb.conf"
MAIN_CONF=""
if [ -f "/etc/redis/redis.conf" ]; then
  MAIN_CONF="/etc/redis/redis.conf"
elif [ -f "/etc/redis.conf" ]; then
  MAIN_CONF="/etc/redis.conf"
  CONF_SNIPPET="/etc/classicconcepts-redis-100mb.conf"
fi

if [ -n "$MAIN_CONF" ]; then
  $SUDO mkdir -p "$(dirname "$CONF_SNIPPET")"
  $SUDO tee "$CONF_SNIPPET" >/dev/null <<EOF
# Managed by Classic Concepts (100MB Pure In-Memory Cache)
maxmemory ${MAX_BYTES}
maxmemory-policy allkeys-lru
save ""
appendonly no
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
EOF

  if ! $SUDO grep -Fq "include ${CONF_SNIPPET}" "$MAIN_CONF"; then
    echo "" | $SUDO tee -a "$MAIN_CONF" >/dev/null
    echo "include ${CONF_SNIPPET}" | $SUDO tee -a "$MAIN_CONF" >/dev/null
  fi
fi

# 3. Enable & start Redis service
REDIS_SVC="redis-server"
if command -v systemctl >/dev/null 2>&1; then
  if ! systemctl list-unit-files | grep -q "^redis-server\.service"; then
    REDIS_SVC="redis"
  fi
  $SUDO systemctl enable "$REDIS_SVC" >/dev/null 2>&1 || true
  $SUDO systemctl start "$REDIS_SVC" || $SUDO systemctl restart "$REDIS_SVC" || true
elif command -v service >/dev/null 2>&1; then
  $SUDO service redis-server start || $SUDO service redis start || true
fi

# 4. Enforce 100MB RAM & pure in-memory settings live via redis-cli (zero restart needed if already running)
if command -v redis-cli >/dev/null 2>&1 && redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
  redis-cli -h 127.0.0.1 -p 6379 CONFIG SET maxmemory "${MAX_BYTES}" >/dev/null || true
  redis-cli -h 127.0.0.1 -p 6379 CONFIG SET maxmemory-policy "allkeys-lru" >/dev/null || true
  redis-cli -h 127.0.0.1 -p 6379 CONFIG SET save "" >/dev/null || true
  redis-cli -h 127.0.0.1 -p 6379 CONFIG SET appendonly "no" >/dev/null || true
  redis-cli -h 127.0.0.1 -p 6379 CONFIG REWRITE >/dev/null 2>&1 || true

  LIVE_MAX=$(redis-cli -h 127.0.0.1 -p 6379 CONFIG GET maxmemory | tail -n 1)
  LIVE_POLICY=$(redis-cli -h 127.0.0.1 -p 6379 CONFIG GET maxmemory-policy | tail -n 1)
  echo "✅ Redis live at 127.0.0.1:6379 (maxmemory=${LIVE_MAX} bytes [100MB], policy=${LIVE_POLICY}, pure RAM)"
else
  echo "⚠️ redis-cli could not reach 127.0.0.1:6379; Next.js will seamlessly use its built-in 100MB in-memory LRU cache."
fi
