import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { revalidateCatalogPaths } from "@/lib/product-mutations";
import { invalidateCacheTags } from "@/lib/redis-cache";
import {
  autoGroupGranularCategories,
  convertCategoriesToSubcategories,
  executeCustomCategoryMappingPlan,
  generateAcrioTaxonomyDescription,
  mergeCategoriesIntoTarget,
  runSmartCatalogAlignment,
  upsertSubCategoryItem,
} from "@/lib/taxonomy-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "convert_to_subcategories") {
      const res = await convertCategoriesToSubcategories({
        sourceCategoryIds: Array.isArray(body?.sourceCategoryIds)
          ? body.sourceCategoryIds
          : [],
        targetParentId: body?.targetParentId
          ? String(body.targetParentId)
          : undefined,
        newParentName: body?.newParentName
          ? String(body.newParentName)
          : undefined,
        newParentDescription: body?.newParentDescription
          ? String(body.newParentDescription)
          : undefined,
        customOverrides:
          body?.customOverrides && typeof body.customOverrides === "object"
            ? body.customOverrides
            : undefined,
      });
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "execute_custom_mapping_plan") {
      const res = await executeCustomCategoryMappingPlan({
        parents: Array.isArray(body?.parents) ? body.parents : [],
        items: Array.isArray(body?.items) ? body.items : [],
      });
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "merge_categories") {
      const res = await mergeCategoriesIntoTarget({
        sourceCategoryIds: Array.isArray(body?.sourceCategoryIds)
          ? body.sourceCategoryIds
          : [],
        targetCategoryId: String(body?.targetCategoryId || ""),
      });
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "auto_group_families") {
      const dryRun = body?.dryRun !== false;
      const res = await autoGroupGranularCategories({ dryRun });
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "smart_align_all") {
      const dryRun = body?.dryRun !== false;
      const res = await runSmartCatalogAlignment({
        dryRun,
        approvedTaxonomyUpdates: Array.isArray(body?.approvedTaxonomyUpdates)
          ? body.approvedTaxonomyUpdates
          : undefined,
        syncProductParents: body?.syncProductParents,
        syncPodiumFlags: body?.syncPodiumFlags,
        approvedTeamUpdates: Array.isArray(body?.approvedTeamUpdates)
          ? body.approvedTeamUpdates
          : undefined,
      });
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "upsert_subcategory") {
      const item = await upsertSubCategoryItem({
        id: body?.id ? String(body.id) : undefined,
        categoryId: String(body?.categoryId || ""),
        name: String(body?.name || ""),
        slug: body?.slug ? String(body.slug) : undefined,
        description:
          body?.description !== undefined ? String(body.description) : undefined,
        descriptionHtml:
          body?.descriptionHtml !== undefined
            ? String(body.descriptionHtml)
            : undefined,
        imageUrl: body?.imageUrl ? String(body.imageUrl) : undefined,
        sortOrder:
          typeof body?.sortOrder === "number" ? body.sortOrder : undefined,
      });
      return NextResponse.json({ ok: true, subcategory: item });
    }

    if (action === "delete_subcategory") {
      const id = String(body?.id || "").trim();
      if (!id) {
        return NextResponse.json(
          { ok: false, error: "Missing subcategory ID." },
          { status: 400 }
        );
      }
      // Products keep their main `categoryId` and have `subCategoryId` set to null safely (`onDelete: SetNull`)
      await prisma.subCategory.delete({ where: { id } });
      await invalidateCacheTags(["taxonomy", "catalog", "ai-snapshot", "ai-responses"]);
      try {
        revalidatePath("/admin/categories");
      } catch {
        // Safe fallback outside request context
      }
      revalidateCatalogPaths();
      return NextResponse.json({ ok: true });
    }

    if (action === "generate_description") {
      const text = await generateAcrioTaxonomyDescription({
        name: String(body?.name || ""),
        parentName: body?.parentName ? String(body.parentName) : undefined,
      });
      return NextResponse.json({ ok: true, description: text });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown taxonomy action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[api/admin/taxonomy] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Taxonomy operation failed.",
      },
      { status: 400 }
    );
  }
}
