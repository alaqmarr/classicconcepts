import Redis from "ioredis";
import { revalidatePath } from "next/cache";

export const REDIS_MAX_MEMORY_BYTES =
  Number(process.env.REDIS_MAXMEMORY_BYTES) > 0
    ? Number(process.env.REDIS_MAXMEMORY_BYTES)
    : 100 * 1024 * 1024; // Strict 100 MB (104,857,600 bytes)

export const ALL_CACHE_TAGS = [
  "catalog",
  "taxonomy",
  "site-content",
  "settings",
  "brand",
  "ai-snapshot",
  "ai-responses",
] as const;

export type CacheTag = (typeof ALL_CACHE_TAGS)[number];

interface MemoryCacheEntry {
  json: string;
  bytes: number;
  expiresAt: number;
  tags: CacheTag[];
}

interface GlobalRedisCacheState {
  redisClient: Redis | null;
  redisInitStarted: boolean;
  redisReady: boolean;
  redisConfigured100Mb: boolean;
  redisUrl: string;
  lastRedisError: string | null;

  // 100MB byte-metered LRU fallback engine (Map preserves insertion order; promote on get = O(1) LRU)
  memoryStore: Map<string, MemoryCacheEntry>;
  memoryUsedBytes: number;
  tagKeySets: Map<CacheTag, Set<string>>;

  // Monotonic tag versions for instant race-free invalidation
  tagVersions: Record<CacheTag, number>;
  tagVersionsSyncedFromRedis: boolean;

  // Singleflight stampede protection
  inflight: Map<string, Promise<unknown>>;

  // Telemetry & warm status
  hits: number;
  misses: number;
  writes: number;
  evictions: number;
  invalidations: number;
  lastInvalidatedAt: number | null;
  lastWarmedAt: number | null;
  isWarming: boolean;
  warmTimer: ReturnType<typeof setTimeout> | null;
  warmHandler: (() => Promise<void>) | null;
  invalidationHooks: Set<(tags: CacheTag[]) => void>;
}

const globalRef = globalThis as unknown as {
  __ccRedisCacheEngine?: GlobalRedisCacheState;
};

function createInitialTagVersions(): Record<CacheTag, number> {
  return {
    catalog: 1,
    taxonomy: 1,
    "site-content": 1,
    settings: 1,
    brand: 1,
    "ai-snapshot": 1,
    "ai-responses": 1,
  };
}

function getEngineState(): GlobalRedisCacheState {
  if (!globalRef.__ccRedisCacheEngine) {
    const tagKeySets = new Map<CacheTag, Set<string>>();
    for (const tag of ALL_CACHE_TAGS) {
      tagKeySets.set(tag, new Set<string>());
    }

    globalRef.__ccRedisCacheEngine = {
      redisClient: null,
      redisInitStarted: false,
      redisReady: false,
      redisConfigured100Mb: false,
      redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
      lastRedisError: null,
      memoryStore: new Map<string, MemoryCacheEntry>(),
      memoryUsedBytes: 0,
      tagKeySets,
      tagVersions: createInitialTagVersions(),
      tagVersionsSyncedFromRedis: false,
      inflight: new Map<string, Promise<unknown>>(),
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0,
      invalidations: 0,
      lastInvalidatedAt: null,
      lastWarmedAt: null,
      isWarming: false,
      warmTimer: null,
      warmHandler: null,
      invalidationHooks: new Set(),
    };
  }
  return globalRef.__ccRedisCacheEngine;
}

const TAG_VERSIONS_HASH_KEY = "cc:meta:tag_versions";

function ensureRedisConnection(state: GlobalRedisCacheState): void {
  if (state.redisInitStarted) return;
  if (process.env.REDIS_DISABLED === "1" || process.env.REDIS_DISABLED === "true") {
    state.redisInitStarted = true;
    state.lastRedisError = "REDIS_DISABLED=true (using 100MB in-memory LRU engine)";
    return;
  }

  state.redisInitStarted = true;

  try {
    const client = new Redis(state.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      connectTimeout: 450,
      commandTimeout: 800,
      retryStrategy(times) {
        // Gentle background reconnect if local redis-server is offline or restarting
        return Math.min(times * 5000, 30000);
      },
    });

    client.on("error", (err) => {
      state.redisReady = false;
      state.lastRedisError = err?.message || "Redis connection unavailable";
    });

    client.on("close", () => {
      state.redisReady = false;
    });

    client.on("end", () => {
      state.redisReady = false;
    });

    client.on("ready", () => {
      state.redisReady = true;
      state.lastRedisError = null;

      // Enforce strict 100MB pure in-memory LRU configuration on Redis server
      void (async () => {
        try {
          if (!state.redisConfigured100Mb) {
            state.redisConfigured100Mb = true;
            await client
              .pipeline()
              .config("SET", "maxmemory", String(REDIS_MAX_MEMORY_BYTES))
              .config("SET", "maxmemory-policy", "allkeys-lru")
              .config("SET", "save", "")
              .config("SET", "appendonly", "no")
              .exec()
              .catch(() => {});
          }

          // Sync monotonic tag versions with Redis so restarts/workers stay consistent
          const existing = await client.hgetall(TAG_VERSIONS_HASH_KEY).catch(() => ({}));
          const updates: Record<string, string> = {};
          for (const tag of ALL_CACHE_TAGS) {
            const remoteVer = Number((existing as Record<string, string>)?.[tag] || 0);
            const localVer = state.tagVersions[tag] || 1;
            const merged = Math.max(remoteVer, localVer, 1);
            state.tagVersions[tag] = merged;
            if (remoteVer !== merged) {
              updates[tag] = String(merged);
            }
          }
          if (Object.keys(updates).length > 0) {
            await client.hset(TAG_VERSIONS_HASH_KEY, updates).catch(() => {});
          }
          state.tagVersionsSyncedFromRedis = true;

          // Free Node V8 heap fallback entries once dedicated 100MB Redis daemon is ready
          if (state.memoryStore.size > 0) {
            state.memoryStore.clear();
            state.memoryUsedBytes = 0;
            for (const set of state.tagKeySets.values()) {
              set.clear();
            }
          }
        } catch {
          // Non-blocking sync
        }
      })();
    });

    state.redisClient = client;
    void client.connect().catch((err) => {
      state.redisReady = false;
      state.lastRedisError = err?.message || "Redis offline; using 100MB in-memory LRU";
    });
  } catch (err: any) {
    state.redisReady = false;
    state.lastRedisError = err?.message || "Failed to initialize ioredis";
  }
}

// ---------- 100MB Byte-Metered In-Memory LRU Store Operations ----------

function computeEntryBytes(key: string, json: string): number {
  // Accurate UTF-8 byte accounting + 64-byte object/Map slot overhead
  return Buffer.byteLength(key, "utf8") + Buffer.byteLength(json, "utf8") + 64;
}

function removeMemoryKey(state: GlobalRedisCacheState, fullKey: string): void {
  const existing = state.memoryStore.get(fullKey);
  if (!existing) return;
  state.memoryStore.delete(fullKey);
  state.memoryUsedBytes = Math.max(0, state.memoryUsedBytes - existing.bytes);
  for (const tag of existing.tags) {
    state.tagKeySets.get(tag)?.delete(fullKey);
  }
}

function getFromMemoryLru(state: GlobalRedisCacheState, fullKey: string): string | null {
  const entry = state.memoryStore.get(fullKey);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    removeMemoryKey(state, fullKey);
    return null;
  }

  // Promote to Most-Recently-Used position in O(1)
  state.memoryStore.delete(fullKey);
  state.memoryStore.set(fullKey, entry);
  return entry.json;
}

function setInMemoryLru(
  state: GlobalRedisCacheState,
  fullKey: string,
  json: string,
  ttlSeconds: number,
  tags: CacheTag[]
): void {
  const bytes = computeEntryBytes(fullKey, json);

  // Never allow a single oversized item to breach the 100MB ceiling
  if (bytes > REDIS_MAX_MEMORY_BYTES) {
    return;
  }

  // Replace existing key cleanly first if present
  if (state.memoryStore.has(fullKey)) {
    removeMemoryKey(state, fullKey);
  }

  const now = Date.now();

  // Pass 1: Sweep expired keys if approaching limit
  if (state.memoryUsedBytes + bytes > REDIS_MAX_MEMORY_BYTES) {
    for (const [k, v] of state.memoryStore) {
      if (now >= v.expiresAt) {
        removeMemoryKey(state, k);
      }
      if (state.memoryUsedBytes + bytes <= REDIS_MAX_MEMORY_BYTES) {
        break;
      }
    }
  }

  // Pass 2: Strict allkeys-lru eviction from oldest (front of Map) until <= 100MB
  while (
    state.memoryStore.size > 0 &&
    state.memoryUsedBytes + bytes > REDIS_MAX_MEMORY_BYTES
  ) {
    const oldestKey = state.memoryStore.keys().next().value;
    if (!oldestKey) break;
    removeMemoryKey(state, oldestKey);
    state.evictions += 1;
  }

  const expiresAt = now + Math.max(1, ttlSeconds) * 1000;
  state.memoryStore.set(fullKey, {
    json,
    bytes,
    expiresAt,
    tags,
  });
  state.memoryUsedBytes += bytes;

  for (const tag of tags) {
    state.tagKeySets.get(tag)?.add(fullKey);
  }
}

// ---------- Versioned Key & Public Cache Primitives ----------

function buildVersionSignature(state: GlobalRedisCacheState, tags: CacheTag[]): string {
  if (tags.length === 0) return "v0";
  return tags
    .slice()
    .sort()
    .map((t) => `${t}:${state.tagVersions[t] || 1}`)
    .join(",");
}

function buildVersionedKey(
  state: GlobalRedisCacheState,
  rawKey: string,
  tags: CacheTag[]
): string {
  const sig = buildVersionSignature(state, tags);
  return `cc:v1:${rawKey}|${sig}`;
}

export function registerCacheWarmHandler(handler: () => Promise<void>): void {
  const state = getEngineState();
  state.warmHandler = handler;
}

export function registerCacheInvalidationHook(hook: (tags: CacheTag[]) => void): void {
  const state = getEngineState();
  state.invalidationHooks.add(hook);
}

/**
 * Low-level raw cache read (checks 100MB Redis server if live, otherwise 100MB in-memory LRU).
 */
export async function getRawCached<T>(
  rawKey: string,
  tags: CacheTag[] = []
): Promise<T | null> {
  const state = getEngineState();
  ensureRedisConnection(state);

  const fullKey = buildVersionedKey(state, rawKey, tags);

  if (state.redisReady && state.redisClient?.status === "ready") {
    try {
      const val = await state.redisClient.get(fullKey);
      if (val !== null) {
        state.hits += 1;
        return JSON.parse(val) as T;
      }
      state.misses += 1;
      return null;
    } catch {
      // Seamless fallback to memory engine if Redis hiccups mid-request
      state.redisReady = false;
    }
  }

  const memVal = getFromMemoryLru(state, fullKey);
  if (memVal !== null) {
    state.hits += 1;
    try {
      return JSON.parse(memVal) as T;
    } catch {
      removeMemoryKey(state, fullKey);
      return null;
    }
  }

  state.misses += 1;
  return null;
}

/**
 * Low-level raw cache write into 100MB Redis (or 100MB byte-metered in-memory LRU).
 */
export async function setRawCached(
  rawKey: string,
  value: unknown,
  ttlSeconds = 3600,
  tags: CacheTag[] = []
): Promise<void> {
  const state = getEngineState();
  ensureRedisConnection(state);

  const fullKey = buildVersionedKey(state, rawKey, tags);
  const json = JSON.stringify(value);
  const safeTtl = Math.max(5, Math.floor(ttlSeconds));
  state.writes += 1;

  if (state.redisReady && state.redisClient?.status === "ready") {
    try {
      const byteLen = computeEntryBytes(fullKey, json);
      if (byteLen > REDIS_MAX_MEMORY_BYTES) return;

      const pipe = state.redisClient.pipeline();
      pipe.set(fullKey, json, "EX", safeTtl);
      for (const tag of tags) {
        const setKey = `cc:tagkeys:${tag}`;
        pipe.sadd(setKey, fullKey);
        pipe.expire(setKey, Math.max(safeTtl, 7200));
      }
      await pipe.exec();
      return;
    } catch {
      state.redisReady = false;
    }
  }

  setInMemoryLru(state, fullKey, json, safeTtl, tags);
}

/**
 * Read-through cache wrapper with:
 * - Tag-versioned keys (zero stale reads after admin edits)
 * - Singleflight concurrent stampede deduplication
 * - 100MB Redis server primary + 100MB byte-metered LRU fallback
 */
export async function rememberCached<T>(
  rawKey: string,
  tags: CacheTag[],
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const state = getEngineState();
  ensureRedisConnection(state);

  const fullKey = buildVersionedKey(state, rawKey, tags);

  // 1. Fast cache lookup
  if (state.redisReady && state.redisClient?.status === "ready") {
    try {
      const cached = await state.redisClient.get(fullKey);
      if (cached !== null) {
        state.hits += 1;
        return JSON.parse(cached) as T;
      }
    } catch {
      state.redisReady = false;
    }
  } else {
    const memHit = getFromMemoryLru(state, fullKey);
    if (memHit !== null) {
      state.hits += 1;
      try {
        return JSON.parse(memHit) as T;
      } catch {
        removeMemoryKey(state, fullKey);
      }
    }
  }

  // 2. Singleflight: share in-flight DB computation across concurrent callers
  const existingFlight = state.inflight.get(fullKey);
  if (existingFlight) {
    state.hits += 1;
    return (await existingFlight) as T;
  }

  state.misses += 1;

  const flightPromise = (async () => {
    try {
      const fresh = await fetcher();
      await setRawCached(rawKey, fresh, ttlSeconds, tags);
      return fresh;
    } finally {
      state.inflight.delete(fullKey);
    }
  })();

  state.inflight.set(fullKey, flightPromise);
  return flightPromise;
}

// ---------- Precision Invalidation, Next.js Revalidation & Auto-Warming ----------

const TAG_DEFAULT_PATHS: Record<CacheTag, string[]> = {
  catalog: [
    "/",
    "/shop",
    "/shop/c",
    "/podiums",
    "/shop/industry",
    "/shop/problem",
    "/sitemap.xml",
  ],
  taxonomy: [
    "/",
    "/shop",
    "/shop/c",
    "/podiums",
    "/shop/industry",
    "/shop/problem",
    "/sitemap.xml",
  ],
  "site-content": [
    "/",
    "/shop",
    "/shop/c",
    "/podiums",
    "/about",
    "/about/certificates",
    "/about/clients",
    "/about/infrastructure",
    "/about/press",
    "/about/team",
    "/resources",
    "/contact",
    "/online-payments",
  ],
  settings: [
    "/",
    "/shop",
    "/podiums",
    "/about",
    "/about/infrastructure",
    "/about/press",
    "/about/team",
    "/contact",
    "/online-payments",
  ],
  brand: [
    "/",
    "/about",
    "/about/certificates",
    "/about/clients",
    "/about/infrastructure",
    "/about/press",
    "/about/team",
    "/resources",
    "/contact",
    "/online-payments",
  ],
  "ai-snapshot": [],
  "ai-responses": [],
};

function safeRevalidatePaths(tags: CacheTag[], extraPaths?: string[]): void {
  try {
    const uniquePaths = new Set<string>();
    for (const tag of tags) {
      for (const p of TAG_DEFAULT_PATHS[tag] || []) {
        uniquePaths.add(p);
      }
    }
    for (const extra of extraPaths || []) {
      if (extra && extra.startsWith("/")) {
        uniquePaths.add(extra);
      }
    }

    // Revalidate root layout when global chrome/navigation/site-content/settings change
    if (
      tags.includes("site-content") ||
      tags.includes("settings") ||
      tags.includes("taxonomy") ||
      tags.includes("catalog")
    ) {
      revalidatePath("/", "layout");
    }

    for (const p of uniquePaths) {
      revalidatePath(p);
    }
  } catch {
    // Safe no-op when called outside Next.js HTTP request store (e.g., CLI scripts / background warmers)
  }
}

export function scheduleBackgroundWarm(delayMs = 60): void {
  const state = getEngineState();
  if (!state.warmHandler) return;
  if (state.warmTimer) {
    clearTimeout(state.warmTimer);
  }
  state.warmTimer = setTimeout(() => {
    state.warmTimer = null;
    if (state.isWarming || !state.warmHandler) return;
    state.isWarming = true;
    void state
      .warmHandler()
      .then(() => {
        state.lastWarmedAt = Date.now();
      })
      .catch(() => {})
      .finally(() => {
        state.isWarming = false;
      });
  }, delayMs);

  if (typeof state.warmTimer?.unref === "function") {
    state.warmTimer.unref();
  }
}

/**
 * Precision On-Demand Cache Invalidation:
 * 1. Atomically increments tag versions so any concurrent/immediate reload NEVER sees stale data.
 * 2. Purges obsolete keys for those tags from Redis / 100MB LRU memory immediately.
 * 3. Triggers Next.js `revalidatePath` on affected routes/layouts.
 * 4. Schedules non-blocking background re-warming so subsequent customer visits hit warm RAM (0 DB queries).
 */
export async function invalidateCacheTags(
  tags: CacheTag[],
  options?: {
    paths?: string[];
    skipRevalidatePath?: boolean;
    warm?: boolean;
  }
): Promise<void> {
  const uniqueTags = Array.from(new Set(tags));
  if (uniqueTags.length === 0) return;

  const state = getEngineState();
  ensureRedisConnection(state);

  // 1. Bump monotonic tag versions immediately in memory
  for (const tag of uniqueTags) {
    state.tagVersions[tag] = (state.tagVersions[tag] || 1) + 1;
  }
  state.invalidations += 1;
  state.lastInvalidatedAt = Date.now();

  // 2. Purge obsolete keys from in-memory LRU store immediately
  for (const tag of uniqueTags) {
    const tracked = state.tagKeySets.get(tag);
    if (tracked && tracked.size > 0) {
      for (const fullKey of Array.from(tracked)) {
        removeMemoryKey(state, fullKey);
      }
      tracked.clear();
    }
  }

  // 3. Notify any registered in-process hooks (e.g. AI snapshot pointers)
  for (const hook of state.invalidationHooks) {
    try {
      hook(uniqueTags);
    } catch {
      // Ignore hook errors
    }
  }

  // 4. Sync tag versions & unlink old tag keys in Redis server if connected
  if (state.redisReady && state.redisClient?.status === "ready") {
    try {
      const client = state.redisClient;
      const versionPipe = client.pipeline();
      for (const tag of uniqueTags) {
        versionPipe.hset(TAG_VERSIONS_HASH_KEY, tag, String(state.tagVersions[tag]));
        versionPipe.smembers(`cc:tagkeys:${tag}`);
      }
      const results = await versionPipe.exec();

      const keysToDelete: string[] = [];
      const setKeysToDelete: string[] = [];
      if (Array.isArray(results)) {
        uniqueTags.forEach((tag, idx) => {
          setKeysToDelete.push(`cc:tagkeys:${tag}`);
          const smembersTuple = results[idx * 2 + 1];
          const members = Array.isArray(smembersTuple?.[1])
            ? (smembersTuple![1] as string[])
            : [];
          for (const m of members) {
            if (typeof m === "string" && m) keysToDelete.push(m);
          }
        });
      }

      if (keysToDelete.length > 0 || setKeysToDelete.length > 0) {
        const delPipe = client.pipeline();
        if (keysToDelete.length > 0) {
          delPipe.unlink(...Array.from(new Set(keysToDelete)));
        }
        if (setKeysToDelete.length > 0) {
          delPipe.unlink(...setKeysToDelete);
        }
        await delPipe.exec().catch(() => {});
      }
    } catch {
      state.redisReady = false;
    }
  }

  // 5. Revalidate Next.js App Router paths
  if (!options?.skipRevalidatePath) {
    safeRevalidatePaths(uniqueTags, options?.paths);
  }

  // 6. Proactively re-warm public catalog/chrome/AI snapshot in background
  if (options?.warm !== false) {
    scheduleBackgroundWarm(50);
  }
}

/**
 * Full cache flush + immediate re-warm (used by Admin "Purge & Re-Warm Cache" button).
 */
export async function flushAllCacheAndWarm(): Promise<void> {
  const state = getEngineState();
  ensureRedisConnection(state);

  // Bump every tag version
  for (const tag of ALL_CACHE_TAGS) {
    state.tagVersions[tag] = (state.tagVersions[tag] || 1) + 1;
  }

  state.memoryStore.clear();
  state.memoryUsedBytes = 0;
  for (const set of state.tagKeySets.values()) {
    set.clear();
  }
  state.invalidations += 1;
  state.lastInvalidatedAt = Date.now();

  for (const hook of state.invalidationHooks) {
    try {
      hook([...ALL_CACHE_TAGS]);
    } catch {
      // Ignore
    }
  }

  if (state.redisReady && state.redisClient?.status === "ready") {
    try {
      const client = state.redisClient;
      await client.flushdb("ASYNC").catch(() => client.flushdb());
      const updates: Record<string, string> = {};
      for (const tag of ALL_CACHE_TAGS) {
        updates[tag] = String(state.tagVersions[tag]);
      }
      await client.hset(TAG_VERSIONS_HASH_KEY, updates).catch(() => {});
    } catch {
      state.redisReady = false;
    }
  }

  safeRevalidatePaths([...ALL_CACHE_TAGS]);

  if (state.warmHandler) {
    state.isWarming = true;
    try {
      await state.warmHandler();
      state.lastWarmedAt = Date.now();
    } finally {
      state.isWarming = false;
    }
  }
}

export interface CacheHealthStats {
  backend: "redis-server" | "in-memory-lru-100mb";
  redisConnected: boolean;
  redisUrl: string;
  maxMemoryBytes: number;
  maxMemoryMb: number;
  usedMemoryBytes: number;
  usedMemoryMb: number;
  usedPercent: number;
  evictionPolicy: "allkeys-lru";
  keyCount: number;
  hits: number;
  misses: number;
  writes: number;
  evictions: number;
  invalidations: number;
  hitRatePercent: number;
  tagVersions: Record<CacheTag, number>;
  lastWarmedAt: string | null;
  lastInvalidatedAt: string | null;
  isWarming: boolean;
  note: string;
}

export async function getCacheHealthStats(): Promise<CacheHealthStats> {
  const state = getEngineState();
  ensureRedisConnection(state);

  let usedMemoryBytes = state.memoryUsedBytes;
  let keyCount = state.memoryStore.size;
  let evictions = state.evictions;
  let backend: CacheHealthStats["backend"] = "in-memory-lru-100mb";
  let redisConnected = false;

  if (state.redisReady && state.redisClient?.status === "ready") {
    try {
      const [infoMem, infoStats, dbSize] = await Promise.all([
        state.redisClient.info("memory"),
        state.redisClient.info("stats"),
        state.redisClient.dbsize(),
      ]);
      redisConnected = true;
      backend = "redis-server";
      keyCount = dbSize;

      const usedMatch = infoMem.match(/^used_memory:(\d+)/m);
      if (usedMatch) {
        usedMemoryBytes = Number(usedMatch[1]);
      }
      const evictedMatch = infoStats.match(/^evicted_keys:(\d+)/m);
      if (evictedMatch) {
        evictions = Number(evictedMatch[1]);
      }
    } catch {
      state.redisReady = false;
    }
  }

  const totalLookups = state.hits + state.misses;
  const hitRatePercent =
    totalLookups > 0 ? Math.round((state.hits / totalLookups) * 1000) / 10 : 100;

  const maxMemoryMb = Math.round((REDIS_MAX_MEMORY_BYTES / (1024 * 1024)) * 100) / 100;
  const usedMemoryMb = Math.round((usedMemoryBytes / (1024 * 1024)) * 100) / 100;
  const usedPercent = Math.min(
    100,
    Math.round((usedMemoryBytes / REDIS_MAX_MEMORY_BYTES) * 1000) / 10
  );

  return {
    backend,
    redisConnected,
    redisUrl: state.redisUrl.replace(/:[^:@/]+@/, ":***@"),
    maxMemoryBytes: REDIS_MAX_MEMORY_BYTES,
    maxMemoryMb,
    usedMemoryBytes,
    usedMemoryMb,
    usedPercent,
    evictionPolicy: "allkeys-lru",
    keyCount,
    hits: state.hits,
    misses: state.misses,
    writes: state.writes,
    evictions,
    invalidations: state.invalidations,
    hitRatePercent,
    tagVersions: { ...state.tagVersions },
    lastWarmedAt: state.lastWarmedAt ? new Date(state.lastWarmedAt).toISOString() : null,
    lastInvalidatedAt: state.lastInvalidatedAt
      ? new Date(state.lastInvalidatedAt).toISOString()
      : null,
    isWarming: state.isWarming,
    note: redisConnected
      ? "Connected to local 100MB in-memory Redis server (allkeys-lru, zero disk I/O)."
      : "Active on built-in 100MB byte-metered in-memory LRU engine (auto-promotes to redis-server when live).",
  };
}
