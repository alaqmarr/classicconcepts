import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sqliteInitialized: boolean | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./dev.db",
    timeout: 10000, // Wait up to 10s on lock contention instead of throwing SQLITE_BUSY
  });

  return new PrismaClient({ adapter });
}

// Always reuse a single PrismaClient instance in BOTH development and production
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

// Configure SQLite WAL mode & bounded page cache once per process
if (!globalForPrisma.sqliteInitialized) {
  globalForPrisma.sqliteInitialized = true;
  Promise.resolve()
    .then(async () => {
      await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
      await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
      await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 10000;");
      await prisma.$queryRawUnsafe("PRAGMA cache_size = -16000;"); // Cap SQLite cache to ~16MB
      await prisma.$queryRawUnsafe("PRAGMA temp_store = MEMORY;");
    })
    .catch((err) => {
      console.warn("SQLite PRAGMA initialization notice:", err?.message || err);
    });
}
