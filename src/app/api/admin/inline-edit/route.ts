import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  invalidateAiCatalogCache,
  invalidateAiSettingsCache,
} from "@/lib/ai-context";
import { invalidateSiteContentCache } from "@/lib/site-content";
import { invalidateCacheTags } from "@/lib/redis-cache";
import {
  bulletsToCleanHtml,
  bulletsToPlainSummary,
} from "@/lib/bullet-formatter";
import {
  revalidateCatalogPaths,
  sanitizeRichHtml,
} from "@/lib/product-mutations";
import {
  parseVideoUrlEntries,
  serializeVideoUrlEntries,
} from "@/lib/youtube";

export const dynamic = "force-dynamic";

const ALLOWED_SITE_SETTING_FIELDS = new Set([
  "address",
  "phone1",
  "phone2",
  "whatsappNumber",
  "email",
  "email2",
  "businessHours",
  "upiId",
  "upiName",
  "aboutIntroImage",
  "aboutCertIso",
  "aboutCertHym",
  "aboutCertGa",
  "aboutCertAscb",
  "infraVideoUrl",
  "pressVideoUrl",
  "homeVideoUrl",
  "pressClipping1",
  "pressClipping2",
  "mapEmbedUrl",
]);

const ALLOWED_ENTITY_FIELDS: Record<string, Set<string>> = {
  category: new Set(["name", "imageUrl", "description", "descriptionHtml", "bgClass"]),
  subCategory: new Set(["name", "imageUrl", "description", "descriptionHtml"]),
  podiumSubCategory: new Set(["name", "description", "descriptionHtml", "imageUrl"]),
  problemStatement: new Set(["name", "description", "imageUrl"]),
  industry: new Set(["name", "description", "imageUrl"]),
  teamMember: new Set([
    "name",
    "position",
    "photoUrl",
    "phone",
    "whatsapp",
    "email",
    "bio",
  ]),
  certificate: new Set(["title", "imageUrl", "issuedBy"]),
  resource: new Set(["title", "description", "fileUrl", "thumbnailUrl", "type"]),
  machinery: new Set(["name", "description", "imageUrl"]),
  pressArticle: new Set([
    "title",
    "publication",
    "date",
    "category",
    "summary",
    "imageUrl",
    "externalUrl",
  ]),
  infrastructureLocation: new Set(["name", "imageUrl", "mapUrl"]),
  client: new Set(["name", "logoUrl"]),
  onlinePlatform: new Set(["name", "storeUrl", "storeRegion", "colorClass"]),
};

function stripDangerousHtml(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
}

function revalidateTargetPaths(pathname?: string, _isGlobalLayout = false) {
  try {
    revalidatePath("/", "layout");
    if (pathname && pathname.startsWith("/")) {
      revalidatePath(pathname);
    }
  } catch {
    // Safe fallback outside request revalidation context
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
    const kind = String(body?.kind || "");
    const pathname = typeof body?.pathname === "string" ? body.pathname : "/";

    // 0. Reset a SiteContent override back to original JSX design default
    if (kind === "reset_site_content") {
      const key = String(body?.key || "").trim();
      if (!key) {
        return NextResponse.json(
          { ok: false, error: "Invalid content key." },
          { status: 400 }
        );
      }
      await prisma.siteContent.deleteMany({ where: { key } });
      await invalidateSiteContentCache([pathname]);
      await invalidateCacheTags(["site-content", "ai-snapshot"], {
        paths: [pathname],
      });
      invalidateAiCatalogCache();
      const isGlobal = key.startsWith("footer.") || key.startsWith("header.");
      revalidateTargetPaths(pathname, isGlobal);
      return NextResponse.json({ ok: true, reset: true, key });
    }

    // 1. Generic SiteContent key-value store (headings, badges, paragraphs, hero/about copy, images)
    if (kind === "site_content") {
      const key = String(body?.key || "").trim();
      const type = String(body?.type || "text").trim();
      let value = String(body?.value ?? "");

      if (!key || key.length > 160) {
        return NextResponse.json(
          { ok: false, error: "Invalid content key." },
          { status: 400 }
        );
      }

      if (type === "html") {
        value = stripDangerousHtml(sanitizeRichHtml(value) || "");
      } else {
        value = value.trim();
      }

      const saved = await prisma.siteContent.upsert({
        where: { key },
        update: { value, type },
        create: { key, value, type },
      });

      await invalidateSiteContentCache([pathname]);
      await invalidateCacheTags(["site-content", "ai-snapshot"], {
        paths: [pathname],
      });
      invalidateAiCatalogCache();
      const isGlobal = key.startsWith("footer.") || key.startsWith("header.");
      revalidateTargetPaths(pathname, isGlobal);

      return NextResponse.json({ ok: true, item: saved });
    }

    // 2. SiteSetting singleton field
    if (kind === "site_setting") {
      const field = String(body?.field || "").trim();
      if (!ALLOWED_SITE_SETTING_FIELDS.has(field)) {
        return NextResponse.json(
          { ok: false, error: `Field '${field}' is not inline-editable.` },
          { status: 400 }
        );
      }

      const rawVal = body?.value;
      const cleanVal =
        rawVal === null || rawVal === undefined ? "" : String(rawVal).trim();

      const existing = await prisma.siteSetting.findUnique({
        where: { id: "default" },
      });

      if (existing) {
        await prisma.siteSetting.update({
          where: { id: "default" },
          data: { [field]: cleanVal || (field === "address" || field === "phone1" || field === "email" ? existing[field as "address" | "phone1" | "email"] : null) },
        });
      } else {
        await prisma.siteSetting.create({
          data: {
            id: "default",
            address:
              "M/s. Classic Concepts Acrylic Private Limited, 1-6-44/2, Muthiyam Reddy Estate, Secunderabad - 500 015, Telangana, India",
            phone1: "+917337222876",
            email: "sales@classicconcepts.in",
            [field]: cleanVal,
          },
        });
      }

      await invalidateCacheTags(["settings", "brand", "ai-snapshot"], {
        paths: [pathname],
      });
      invalidateAiSettingsCache();
      invalidateAiCatalogCache();
      revalidateTargetPaths(pathname, true);

      return NextResponse.json({ ok: true, field, value: cleanVal });
    }

    // 3. Entity model field (Category, Industry, ProblemStatement, TeamMember, Machinery, PressArticle, etc.)
    if (kind === "entity_field") {
      const model = String(body?.model || "").trim();
      const id = String(body?.id || "").trim();
      const field = String(body?.field || "").trim();
      const allowedFields = ALLOWED_ENTITY_FIELDS[model];

      if (!allowedFields || !allowedFields.has(field) || !id) {
        return NextResponse.json(
          { ok: false, error: "Invalid entity model, id, or field." },
          { status: 400 }
        );
      }

      let cleanVal: string | null =
        body?.value === null || body?.value === undefined
          ? null
          : String(body.value);

      if (cleanVal !== null) {
        if (field.endsWith("Html")) {
          cleanVal = stripDangerousHtml(sanitizeRichHtml(cleanVal) || "");
        } else {
          cleanVal = cleanVal.trim();
        }
      }

      // Dynamic model dispatch with strict whitelist above
      const delegateMap: Record<
        string,
        { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }
      > = {
        category: prisma.category as never,
        subCategory: prisma.subCategory as never,
        podiumSubCategory: prisma.podiumSubCategory as never,
        problemStatement: prisma.problemStatement as never,
        industry: prisma.industry as never,
        teamMember: prisma.teamMember as never,
        certificate: prisma.certificate as never,
        resource: prisma.resource as never,
        machinery: prisma.machinery as never,
        pressArticle: prisma.pressArticle as never,
        infrastructureLocation: prisma.infrastructureLocation as never,
        client: prisma.client as never,
        onlinePlatform: prisma.onlinePlatform as never,
      };

      await delegateMap[model].update({
        where: { id },
        data: { [field]: cleanVal },
      });

      const isTaxonomyModel =
        model === "category" ||
        model === "subCategory" ||
        model === "podiumSubCategory" ||
        model === "problemStatement" ||
        model === "industry";
      await invalidateCacheTags(
        isTaxonomyModel
          ? ["taxonomy", "catalog", "ai-snapshot", "ai-responses"]
          : ["brand", "settings", "ai-snapshot"],
        { paths: [pathname] }
      );
      revalidateCatalogPaths();
      revalidateTargetPaths(pathname, false);

      return NextResponse.json({ ok: true, model, id, field, value: cleanVal });
    }

    // 4. Direct On-Page Product Patch (Title, SKU, Pricing, Bullet Description, Features, Specs & Dimensions, Gallery, Variants, Note)
    if (kind === "product_patch") {
      const productId = String(body?.productId || "").trim();
      const patch = (body?.patch || {}) as Record<string, unknown>;

      if (!productId) {
        return NextResponse.json(
          { ok: false, error: "Missing productId." },
          { status: 400 }
        );
      }

      const existing = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, slug: true, sku: true },
      });

      if (!existing) {
        return NextResponse.json(
          { ok: false, error: "Product not found." },
          { status: 404 }
        );
      }

      const scalarData: Record<string, unknown> = {};

      if (typeof patch.name === "string" && patch.name.trim()) {
        scalarData.name = patch.name.trim();
      }

      if ("sku" in patch) {
        const nextSku =
          typeof patch.sku === "string" && patch.sku.trim()
            ? patch.sku.trim()
            : null;
        if (nextSku && nextSku !== existing.sku) {
          const duplicateSku = await prisma.product.findUnique({
            where: { sku: nextSku },
            select: { id: true },
          });
          if (duplicateSku && duplicateSku.id !== productId) {
            return NextResponse.json(
              {
                ok: false,
                error: `SKU "${nextSku}" is already used by another product.`,
              },
              { status: 400 }
            );
          }
        }
        scalarData.sku = nextSku;
      }

      if ("categoryId" in patch && typeof patch.categoryId === "string" && patch.categoryId.trim()) {
        const cat = await prisma.category.findUnique({
          where: { id: patch.categoryId.trim() },
          select: { id: true, slug: true, name: true },
        });
        if (cat) {
          scalarData.categoryId = cat.id;
          scalarData.isPodium =
            cat.slug === "podium" ||
            cat.slug === "podiums" ||
            cat.name.toLowerCase().includes("podium");
        }
      }

      if ("subCategoryId" in patch) {
        scalarData.subCategoryId =
          typeof patch.subCategoryId === "string" && patch.subCategoryId.trim()
            ? patch.subCategoryId.trim()
            : null;
      }

      if ("podiumSubCategoryId" in patch) {
        scalarData.podiumSubCategoryId =
          typeof patch.podiumSubCategoryId === "string" &&
          patch.podiumSubCategoryId.trim()
            ? patch.podiumSubCategoryId.trim()
            : null;
      }

      if ("ipProtectionText" in patch) {
        scalarData.ipProtectionText =
          typeof patch.ipProtectionText === "string" &&
          patch.ipProtectionText.trim()
            ? patch.ipProtectionText.trim()
            : null;
      }

      if ("designRegistrationNo" in patch) {
        scalarData.designRegistrationNo =
          typeof patch.designRegistrationNo === "string" &&
          patch.designRegistrationNo.trim()
            ? patch.designRegistrationNo.trim()
            : null;
      }

      if ("basePrice" in patch) {
        const parsed =
          patch.basePrice === null || patch.basePrice === ""
            ? null
            : Number(patch.basePrice);
        scalarData.basePrice =
          parsed !== null && Number.isFinite(parsed) && parsed >= 0
            ? parsed
            : null;
      }

      if ("discountPrice" in patch) {
        const parsed =
          patch.discountPrice === null || patch.discountPrice === ""
            ? null
            : Number(patch.discountPrice);
        scalarData.discountPrice =
          parsed !== null && Number.isFinite(parsed) && parsed >= 0
            ? parsed
            : null;
      }

      if ("discountBadge" in patch) {
        scalarData.discountBadge =
          typeof patch.discountBadge === "string" && patch.discountBadge.trim()
            ? patch.discountBadge.trim()
            : null;
      }

      if ("stockStatus" in patch && typeof patch.stockStatus === "string") {
        scalarData.stockStatus = patch.stockStatus.trim() || "In stock";
      }

      if ("videoUrl" in patch) {
        scalarData.videoUrl =
          typeof patch.videoUrl === "string"
            ? serializeVideoUrlEntries(parseVideoUrlEntries(patch.videoUrl))
            : null;
      }

      if (Array.isArray(patch.bullets)) {
        const cleanBullets = patch.bullets
          .map((b) => String(b ?? "").trim())
          .filter(Boolean);
        scalarData.descriptionHtml = cleanBullets.length
          ? bulletsToCleanHtml(cleanBullets)
          : null;
        scalarData.description = cleanBullets.length
          ? bulletsToPlainSummary(cleanBullets, 4)
          : null;
      }

      if ("importantNoteHtml" in patch) {
        const rawNote =
          typeof patch.importantNoteHtml === "string"
            ? patch.importantNoteHtml
            : "";
        scalarData.importantNoteHtml = rawNote.trim()
          ? stripDangerousHtml(sanitizeRichHtml(rawNote) || "")
          : null;
      }

      await prisma.$transaction(async (tx) => {
        if (Array.isArray(patch.subCategoryIds)) {
          const cleanSubIds = patch.subCategoryIds
            .map((x) => String(x ?? "").trim())
            .filter(Boolean);
          scalarData.subCategoryId = cleanSubIds[0] || null;
          scalarData.subCategories = {
            set: cleanSubIds.map((id) => ({ id })),
          };
        }

        if (Array.isArray(patch.podiumSubCategoryIds)) {
          const cleanPodiumSubIds = patch.podiumSubCategoryIds
            .map((x) => String(x ?? "").trim())
            .filter(Boolean);
          scalarData.podiumSubCategoryId = cleanPodiumSubIds[0] || null;
          scalarData.podiumSubCategories = {
            set: cleanPodiumSubIds.map((id) => ({ id })),
          };
        }

        if (Array.isArray(patch.problemStatementIds)) {
          const cleanPsIds = patch.problemStatementIds
            .map((x) => String(x ?? "").trim())
            .filter(Boolean);
          scalarData.problemStatements = {
            set: cleanPsIds.map((id) => ({ id })),
          };
        }

        if (Array.isArray(patch.industryIds)) {
          const cleanIndIds = patch.industryIds
            .map((x) => String(x ?? "").trim())
            .filter(Boolean);
          scalarData.industries = {
            set: cleanIndIds.map((id) => ({ id })),
          };
        }

        if (Object.keys(scalarData).length > 0) {
          await tx.product.update({
            where: { id: productId },
            data: scalarData,
          });
        }

        if (Array.isArray(patch.features)) {
          const cleanFeatures = patch.features
            .map((f) => String(f ?? "").trim())
            .filter(Boolean);
          await tx.productFeature.deleteMany({ where: { productId } });
          if (cleanFeatures.length > 0) {
            await tx.productFeature.createMany({
              data: cleanFeatures.map((text) => ({ productId, text })),
            });
          }
        }

        if (Array.isArray(patch.specifications)) {
          const cleanSpecs = patch.specifications
            .map((raw) => {
              const item = (raw || {}) as Record<string, unknown>;
              const name = String(item.name ?? "").trim();
              const value = String(item.value ?? "").trim();
              const type =
                item.type === "dimension" ? "dimension" : "specification";
              return { name, value, type };
            })
            .filter((s) => s.name && s.value);

          await tx.productSpecification.deleteMany({ where: { productId } });
          if (cleanSpecs.length > 0) {
            await tx.productSpecification.createMany({
              data: cleanSpecs.map((s) => ({
                productId,
                name: s.name,
                value: s.value,
                type: s.type,
              })),
            });
          }
        }

        if (typeof patch.mainImage === "string" && patch.mainImage.trim()) {
          const newMainUrl = patch.mainImage.trim();
          const currentMain = await tx.productImage.findFirst({
            where: { productId, isMain: true },
            orderBy: { createdAt: "asc" },
          });
          if (currentMain) {
            await tx.productImage.update({
              where: { id: currentMain.id },
              data: { url: newMainUrl },
            });
          } else {
            await tx.productImage.create({
              data: { productId, url: newMainUrl, isMain: true },
            });
          }
        }

        if (Array.isArray(patch.images)) {
          const cleanImages = patch.images
            .map((raw) => {
              const item = (raw || {}) as Record<string, unknown>;
              return {
                url: String(item.url ?? "").trim(),
                isMain: Boolean(item.isMain),
              };
            })
            .filter((img) => Boolean(img.url));

          if (cleanImages.length > 0 && !cleanImages.some((i) => i.isMain)) {
            cleanImages[0].isMain = true;
          } else if (cleanImages.filter((i) => i.isMain).length > 1) {
            let seen = false;
            for (const img of cleanImages) {
              if (img.isMain) {
                if (seen) img.isMain = false;
                seen = true;
              }
            }
          }

          await tx.productImage.deleteMany({ where: { productId } });
          if (cleanImages.length > 0) {
            await tx.productImage.createMany({
              data: cleanImages.map((img) => ({
                productId,
                url: img.url,
                isMain: img.isMain,
              })),
            });
          }
        }

        if (Array.isArray(patch.variants)) {
          await tx.productVariant.deleteMany({ where: { productId } });
          for (const rawVar of patch.variants) {
            const v = (rawVar || {}) as Record<string, unknown>;
            const vName = String(v.name ?? "").trim();
            if (!vName) continue;
            const vPriceNum =
              v.price === null || v.price === undefined || v.price === ""
                ? null
                : Number(v.price);
            const vPrice =
              vPriceNum !== null && Number.isFinite(vPriceNum) && vPriceNum >= 0
                ? vPriceNum
                : null;
            const vImageUrl =
              typeof v.imageUrl === "string" && v.imageUrl.trim()
                ? v.imageUrl.trim()
                : null;
            const extraImgs = Array.isArray(v.images)
              ? v.images
                  .map((u) => String(u ?? "").trim())
                  .filter(Boolean)
              : [];

            await tx.productVariant.create({
              data: {
                productId,
                name: vName,
                price: vPrice,
                imageUrl: vImageUrl || extraImgs[0] || null,
                images:
                  extraImgs.length > 0
                    ? {
                        create: extraImgs.map((url) => ({ url })),
                      }
                    : undefined,
              },
            });
          }
        }
      });

      await invalidateCacheTags(
        ["catalog", "taxonomy", "ai-snapshot", "ai-responses"],
        { paths: [`/shop/p/${existing.slug}`, pathname] }
      );
      revalidateCatalogPaths(existing.slug);
      revalidateTargetPaths(pathname, false);

      return NextResponse.json({ ok: true, slug: existing.slug });
    }

    return NextResponse.json(
      { ok: false, error: `Unsupported inline-edit kind '${kind}'.` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[inline-edit] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save inline change.",
      },
      { status: 500 }
    );
  }
}
