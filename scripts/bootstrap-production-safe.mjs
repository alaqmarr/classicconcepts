#!/usr/bin/env node
/**
 * One-Time Production Bootstrap & Safe Data Retention Script
 *
 * Guarantees during every deployment (`bash update.sh` / `npm run deploy:bootstrap`):
 * 1. Live `SiteContent` (all inline-edited texts, rich HTML, and image URL overrides) is NEVER overwritten or deleted.
 * 2. Live `Category`, `SubCategory`, `Product`, and uploaded R2/media URLs are NEVER overwritten or deleted.
 * 3. `SiteSetting` (`id = 'default'`) is initialized ONLY ONCE if missing. If it already exists, all live production
 *    settings (phones, WhatsApp, emails, address, API keys, video URLs, SMTP, UPI) are 100% retained; only missing
 *    safe defaults (such as `aiModel = 'claude-haiku-5-5'`) are filled in once.
 */

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const ROOT_DIR = process.cwd();
const BACKUPS_DIR = path.join(ROOT_DIR, "backups");
const BOOTSTRAP_MARKER_KEY = "system.bootstrap.site_settings_v1";

function readDatabaseUrlFromEnvFiles() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const candidates = [
    ".env.production.local",
    ".env.local",
    ".env.production",
    ".env",
  ];
  for (const rel of candidates) {
    const full = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(full)) continue;
    try {
      const content = fs.readFileSync(full, "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const m = line.match(/^(?:export\s+)?DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?\s*$/);
        if (m?.[1]) return m[1].trim();
      }
    } catch {
      // Ignore unreadable env file
    }
  }
  return "file:./dev.db";
}

function resolveSqliteFilePath(dbUrl) {
  if (!dbUrl.startsWith("file:")) return path.join(ROOT_DIR, "dev.db");
  const rawPath = dbUrl.slice("file:".length).split("?")[0];
  if (!rawPath || rawPath === ":memory:") return path.join(ROOT_DIR, "dev.db");
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(ROOT_DIR, rawPath);
}

function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);
  return Boolean(row);
}

function getTableColumns(db, tableName) {
  const rows = db.prepare(`PRAGMA table_info("${tableName}")`).all();
  return new Set(rows.map((r) => r.name));
}

function pruneOldFiles(dir, prefix, keepCount = 8) {
  try {
    if (!fs.existsSync(dir)) return;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
      .map((f) => ({
        name: f,
        fullPath: path.join(dir, f),
        mtimeMs: fs.statSync(path.join(dir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    for (const stale of files.slice(keepCount)) {
      fs.unlinkSync(stale.fullPath);
    }
  } catch {
    // Non-fatal cleanup
  }
}

function writePreDeployJsonSafetySnapshot(db) {
  if (!tableExists(db, "SiteContent") && !tableExists(db, "SiteSetting")) {
    return;
  }
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (tableExists(db, "SiteContent")) {
    const siteContentRows = db
      .prepare("SELECT * FROM SiteContent WHERE key NOT LIKE 'system.bootstrap.%' ORDER BY key ASC")
      .all();
    const snapshotPath = path.join(
      BACKUPS_DIR,
      `pre-deploy-site-content-${stamp}.json`
    );
    fs.writeFileSync(
      snapshotPath,
      JSON.stringify(
        {
          schemaVersion: "1.0",
          snapshotType: "pre-deploy-site-content",
          exportedAt: new Date().toISOString(),
          count: siteContentRows.length,
          siteContent: siteContentRows,
        },
        null,
        2
      ),
      "utf8"
    );
    pruneOldFiles(BACKUPS_DIR, "pre-deploy-site-content-", 8);
  }
}

function runBootstrap() {
  const args = new Set(process.argv.slice(2));
  const dbUrl = readDatabaseUrlFromEnvFiles();
  const dbPath = resolveSqliteFilePath(dbUrl);

  if (!fs.existsSync(dbPath)) {
    console.log(`[bootstrap] SQLite file not found yet at ${dbPath}; skipping until prisma db push runs.`);
    return;
  }

  const db = new Database(dbPath, { timeout: 10000 });
  try {
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 10000");

    if (args.has("--pre-push-backup")) {
      writePreDeployJsonSafetySnapshot(db);
      console.log("[bootstrap] Saved pre-deploy SiteContent JSON snapshot to backups/.");
      return;
    }

    if (!tableExists(db, "SiteSetting")) {
      console.log("[bootstrap] SiteSetting table does not exist yet; run `npx prisma db push` first.");
      return;
    }

    const nowIso = new Date().toISOString();
    const hasSiteContentTable = tableExists(db, "SiteContent");
    const settingCols = getTableColumns(db, "SiteSetting");

    const existingMarker = hasSiteContentTable
      ? db
          .prepare("SELECT value FROM SiteContent WHERE key = ?")
          .get(BOOTSTRAP_MARKER_KEY)
      : null;

    const existingSettings = db
      .prepare("SELECT * FROM SiteSetting WHERE id = 'default'")
      .get();

    if (!existingSettings) {
      // ONE-TIME INITIALIZATION: Only runs when no SiteSetting row exists at all.
      const insertCols = ["id", "address", "phone1", "email", "createdAt", "updatedAt"];
      const insertVals = [
        "default",
        "M/s. Classic Concepts Acrylic Private Limited,\n1-6-44/2, Muthiyam Reddy Estate,\nYadamma Nagar, Alwal,\nSecunderabad - 500 015,\nTelangana, India.",
        "+917337222876",
        "sales@classicconcepts.in",
        nowIso,
        nowIso,
      ];

      if (settingCols.has("whatsappNumber")) {
        insertCols.push("whatsappNumber");
        insertVals.push("+917337222876");
      }
      if (settingCols.has("aiModel")) {
        insertCols.push("aiModel");
        insertVals.push("claude-haiku-5-5");
      }
      if (settingCols.has("aiEnabled")) {
        insertCols.push("aiEnabled");
        insertVals.push(1);
      }
      if (settingCols.has("aiPopupEnabled")) {
        insertCols.push("aiPopupEnabled");
        insertVals.push(1);
      }
      if (settingCols.has("aiPopupDelaySeconds")) {
        insertCols.push("aiPopupDelaySeconds");
        insertVals.push(3);
      }
      if (settingCols.has("clientCarouselSpeed")) {
        insertCols.push("clientCarouselSpeed");
        insertVals.push(25);
      }

      const placeholders = insertCols.map(() => "?").join(", ");
      db.prepare(
        `INSERT INTO SiteSetting (${insertCols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`
      ).run(...insertVals);

      console.log("[bootstrap] Created initial SiteSetting ('default') for first-time setup.");
    } else if (!existingMarker) {
      // ONE-TIME SAFE RETENTION MIGRATION:
      // Existing production SiteSetting is preserved 100%; only fill NULL/blank new columns once.
      const patches = [];
      const patchVals = [];

      if (
        settingCols.has("aiModel") &&
        (!existingSettings.aiModel || String(existingSettings.aiModel).trim() === "")
      ) {
        patches.push(`"aiModel" = ?`);
        patchVals.push("claude-haiku-5-5");
      }
      if (
        settingCols.has("whatsappNumber") &&
        (!existingSettings.whatsappNumber || String(existingSettings.whatsappNumber).trim() === "") &&
        existingSettings.phone1
      ) {
        patches.push(`"whatsappNumber" = ?`);
        patchVals.push(String(existingSettings.phone1).trim());
      }

      if (patches.length > 0) {
        patches.push(`"updatedAt" = ?`);
        patchVals.push(nowIso);
        patchVals.push("default");
        db.prepare(`UPDATE SiteSetting SET ${patches.join(", ")} WHERE id = ?`).run(
          ...patchVals
        );
        console.log(
          `[bootstrap] One-time SiteSetting retention backfill applied (${patches.length - 1} empty field(s) initialized; all existing data kept intact).`
        );
      } else {
        console.log("[bootstrap] Existing SiteSetting verified; 100% of live settings retained.");
      }
    } else {
      console.log(
        `[bootstrap] One-time SiteSetting bootstrap already completed (${existingMarker.value}). Retaining all live SiteSetting, SiteContent, images, categories, and products untouched.`
      );
    }

    if (hasSiteContentTable && !existingMarker) {
      db.prepare(
        `INSERT INTO SiteContent ("key", "value", "type", "updatedAt")
         VALUES (?, ?, 'text', ?)
         ON CONFLICT("key") DO NOTHING`
      ).run(BOOTSTRAP_MARKER_KEY, nowIso, nowIso);
    }

    if (hasSiteContentTable) {
      const contentCount = db
        .prepare("SELECT COUNT(*) as cnt FROM SiteContent WHERE key NOT LIKE 'system.bootstrap.%'")
        .get();
      console.log(
        `[bootstrap] Live custom site text/image overrides preserved in DB: ${contentCount?.cnt ?? 0}`
      );
    }
  } finally {
    db.close();
  }
}

runBootstrap();
