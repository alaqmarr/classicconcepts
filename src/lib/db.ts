import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sqliteInitialized: boolean | undefined;
};

function resolveSqlitePath(dbUrl: string): string | null {
  if (!dbUrl.startsWith("file:")) return null;
  const rawPath = dbUrl.slice("file:".length).split("?")[0];
  if (!rawPath || rawPath === ":memory:") return null;
  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawPath);
}

function ensureSqliteWalSynchronously(dbUrl: string) {
  try {
    const filePath = resolveSqlitePath(dbUrl);
    if (!filePath || !fs.existsSync(/*turbopackIgnore: true*/ filePath)) return;
    const rawDb = new Database(filePath, { timeout: 10000 });
    rawDb.pragma("journal_mode = WAL");
    rawDb.pragma("synchronous = NORMAL");
    rawDb.pragma("busy_timeout = 10000");
    rawDb.close();
  } catch (err) {
    // Ignore if DB does not exist yet before initial prisma db push
    console.warn("SQLite sync WAL check skipped:", (err as Error)?.message || err);
  }
}

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  ensureSqliteWalSynchronously(dbUrl);

  const adapter = new PrismaBetterSqlite3({
    url: dbUrl,
    timeout: 10000, // Wait up to 10s on lock contention instead of throwing SQLITE_BUSY
  });

  return new PrismaClient({ adapter });
}

// Always reuse a single PrismaClient instance in BOTH development and production
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

// Apply per-connection SQLite session pragmas once per process
if (!globalForPrisma.sqliteInitialized) {
  globalForPrisma.sqliteInitialized = true;
  Promise.resolve()
    .then(async () => {
      await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
      await prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL;");
      await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 10000;");
      await prisma.$executeRawUnsafe("PRAGMA cache_size = -16000;"); // Cap SQLite cache to ~16MB
      await prisma.$executeRawUnsafe("PRAGMA temp_store = MEMORY;");
      await prisma
        .$executeRawUnsafe(
          "UPDATE Product SET sku = REPLACE(sku, 'CCPO', 'CCP0') WHERE sku LIKE 'CCPO%';"
        )
        .catch(() => {});
    })
    .catch(() => {
      // Safe fallback if connection initializes lazily
    });
}
