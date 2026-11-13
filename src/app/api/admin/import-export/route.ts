import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateSiteContentCache } from "@/lib/site-content";
import { invalidateAiCatalogCache } from "@/lib/ai-context";
import { invalidateCacheTags } from "@/lib/redis-cache";
import {
  exportCatalogBundle,
  exportSiteDataBundle,
  exportSiteSettingsBundle,
  getLiveBundleSummary,
  importCatalogBundle,
  importSiteDataBundle,
  importSiteSettingsBundle,
  inspectImportBundle,
  readServerBackupFile,
  type BundleType,
  type ImportMode,
} from "@/lib/data-import-export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Please sign in as Admin." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const backupFile = searchParams.get("backupFile");
    const bundle = searchParams.get("bundle") as BundleType | null;
    const includeSecrets = searchParams.get("includeSecrets") === "1";

    if (action === "summary") {
      const summary = await getLiveBundleSummary();
      return NextResponse.json({ ok: true, summary });
    }

    if (backupFile) {
      const content = readServerBackupFile(backupFile);
      if (!content) {
        return NextResponse.json(
          { ok: false, error: "Backup file not found." },
          { status: 404 }
        );
      }
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${backupFile}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (
      bundle === "catalog-bundle" ||
      bundle === "site-data" ||
      bundle === "site-settings"
    ) {
      const dateLabel = new Date().toISOString().slice(0, 10);
      const data =
        bundle === "catalog-bundle"
          ? await exportCatalogBundle()
          : bundle === "site-data"
          ? await exportSiteDataBundle()
          : await exportSiteSettingsBundle({ includeSecrets });

      const fileName = `classicconcepts-${bundle}-${dateLabel}.json`;
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const summary = await getLiveBundleSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("[import-export GET] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to export data.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized. Please sign in as Admin." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "preview") {
      const expectedType = body?.expectedType as BundleType | undefined;
      const preview = inspectImportBundle(body?.payload, expectedType);
      return NextResponse.json({ ok: true, preview });
    }

    if (action === "import") {
      const bundleType = body?.bundleType as BundleType;
      const mode: ImportMode = body?.mode === "replace" ? "replace" : "merge";
      const payload = body?.payload;

      if (bundleType === "catalog-bundle") {
        const result = await importCatalogBundle(payload, mode);
        const summary = await getLiveBundleSummary();
        return NextResponse.json({ ok: true, result, summary });
      }
      if (bundleType === "site-data") {
        const result = await importSiteDataBundle(payload, mode);
        const summary = await getLiveBundleSummary();
        return NextResponse.json({ ok: true, result, summary });
      }
      if (bundleType === "site-settings") {
        const result = await importSiteSettingsBundle(payload, mode);
        const summary = await getLiveBundleSummary();
        return NextResponse.json({ ok: true, result, summary });
      }

      return NextResponse.json(
        { ok: false, error: "Invalid bundleType." },
        { status: 400 }
      );
    }

    if (action === "restore_backup") {
      const fileName = String(body?.fileName || "");
      const mode: ImportMode = body?.mode === "merge" ? "merge" : "replace";
      const raw = readServerBackupFile(fileName);
      if (!raw) {
        return NextResponse.json(
          { ok: false, error: "Backup file not found on server." },
          { status: 404 }
        );
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;

      // Handle pre-deploy SiteContent safety snapshots too
      if (parsed.snapshotType === "pre-deploy-site-content" && Array.isArray(parsed.siteContent)) {
        const rows = parsed.siteContent as Array<{
          key: string;
          value: string;
          type?: string;
        }>;
        await prisma.$transaction(async (tx) => {
          if (mode === "replace") {
            await tx.siteContent.deleteMany({
              where: { NOT: { key: { startsWith: "system.bootstrap." } } },
            });
          }
          for (const r of rows) {
            if (!r?.key || r.key.startsWith("system.bootstrap.")) continue;
            await tx.siteContent.upsert({
              where: { key: r.key },
              update: { value: String(r.value ?? ""), type: r.type || "text" },
              create: {
                key: r.key,
                value: String(r.value ?? ""),
                type: r.type || "text",
              },
            });
          }
        });
        await invalidateSiteContentCache();
        await invalidateCacheTags(["site-content", "ai-snapshot"]);
        invalidateAiCatalogCache();
        revalidatePath("/", "layout");
        const summary = await getLiveBundleSummary();
        return NextResponse.json({
          ok: true,
          result: { restoredSnapshot: fileName, count: rows.length },
          summary,
        });
      }

      const bType = parsed.bundleType as BundleType;
      const result =
        bType === "catalog-bundle"
          ? await importCatalogBundle(parsed, mode)
          : bType === "site-data"
          ? await importSiteDataBundle(parsed, mode)
          : await importSiteSettingsBundle(parsed, mode);

      const summary = await getLiveBundleSummary();
      return NextResponse.json({ ok: true, result, summary });
    }

    return NextResponse.json(
      { ok: false, error: `Unsupported action "${action}".` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[import-export POST] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to import data.",
      },
      { status: 400 }
    );
  }
}
