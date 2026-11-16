import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callClaudeHaiku } from "@/lib/ai";
import { invalidateAiCatalogCache } from "@/lib/ai-context";
import { invalidateCacheTags } from "@/lib/redis-cache";

export const dynamic = "force-dynamic";

export type IssueSeverity = "CRITICAL" | "WARNING" | "INFO";
export type IssueCategory =
  | "LINKS_AND_CROSS_SITE"
  | "MEDIA_AND_R2"
  | "PRICING_AND_SPECS"
  | "HTML_AND_CONTENT"
  | "TAXONOMY";

export interface DetectedCatalogIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  site: "CLASSIC_CONCEPTS" | "CLASSIC_EDGE_53" | "WHATSAPP_HUB";
  title: string;
  detail: string;
  entityName: string;
  skuOrSlug?: string | null;
  publicUrl?: string | null;
  adminEditUrl?: string | null;
  autoFixable?: boolean;
  suggestion: string;
}

async function runClassicConceptsEcosystemAudit(askPrompt?: string) {
  const started = Date.now();

  const [
    products,
    categories,
    podiumSubCategories,
    usefulLinks,
    resources,
    certificates,
    settings,
  ] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        podiumSubCategory: true,
        images: true,
        variants: { include: { images: true } },
        specifications: true,
        features: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
        subCategories: true,
      },
    }),
    prisma.podiumSubCategory.findMany({
      include: { _count: { select: { products: true } } },
    }),
    prisma.usefulLink.findMany(),
    prisma.resource.findMany(),
    prisma.certificate.findMany(),
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
  ]);

  const issues: DetectedCatalogIssue[] = [];
  let seq = 1;
  const addIssue = (item: Omit<DetectedCatalogIssue, "id">) => {
    issues.push({ id: `cc_iss_${seq++}`, ...item });
  };

  const skuMap = new Map<string, typeof products>();

  // 1. Audit Products
  for (const p of products) {
    const publicUrl = `/shop/p/${p.slug}`;
    const adminEditUrl = p.isPodium
      ? `/admin/podiums/${p.id}`
      : `/admin/products/${p.id}`;

    if (p.sku && p.sku.trim()) {
      const k = p.sku.trim().toUpperCase();
      skuMap.set(k, [...(skuMap.get(k) || []), p]);
    }

    // 1a. Primary images & R2 HTTPS check
    if (!p.images || p.images.length === 0) {
      addIssue({
        severity: "CRITICAL",
        category: "MEDIA_AND_R2",
        site: "CLASSIC_CONCEPTS",
        title: "Product has 0 photos",
        detail: `${p.name} has no product photos uploaded.`,
        entityName: p.name,
        skuOrSlug: p.sku || p.slug,
        publicUrl,
        adminEditUrl,
        suggestion: "Upload main and angle photos in the Product Editor.",
      });
    } else {
      const badImg = p.images.find(
        (img) =>
          !img.url ||
          /localhost|127\.0\.0\.1/i.test(img.url) ||
          img.url.startsWith("http://")
      );
      if (badImg) {
        addIssue({
          severity: "CRITICAL",
          category: "MEDIA_AND_R2",
          site: "CLASSIC_CONCEPTS",
          title: "Broken or non-HTTPS product photo URL",
          detail: `${p.name} has image URL "${badImg.url}" which is not a valid https:// URL.`,
          entityName: p.name,
          skuOrSlug: p.sku || p.slug,
          publicUrl,
          adminEditUrl,
          autoFixable: badImg.url.startsWith("http://"),
          suggestion: "Ensure all product photos use https:// R2 storage URLs.",
        });
      }
    }

    // 1b. Variant photos
    if (p.variants && p.variants.length > 0) {
      const missingVarPhoto = p.variants.filter(
        (v) => !v.imageUrl && (!v.images || v.images.length === 0)
      );
      if (missingVarPhoto.length > 0) {
        addIssue({
          severity: "WARNING",
          category: "MEDIA_AND_R2",
          site: "CLASSIC_CONCEPTS",
          title: "Variant(s) missing dedicated colour photo",
          detail: `${p.name} has ${missingVarPhoto.length} variant(s) without a photo (${missingVarPhoto.map((v) => v.name).join(", ")}). WhatsApp AI image requests for these variants will fall back to the main product photo.`,
          entityName: `${p.name} (${missingVarPhoto.map((v) => v.name).join(", ")})`,
          skuOrSlug: p.sku || p.slug,
          publicUrl,
          adminEditUrl,
          suggestion: "Open Manage Variants on the product page and assign a photo to each variant.",
        });
      }
    }

    // 1c. Pricing checks
    const effectivePrice = p.discountPrice ?? p.basePrice;
    if (!effectivePrice || effectivePrice <= 0) {
      addIssue({
        severity: "WARNING",
        category: "PRICING_AND_SPECS",
        site: "CLASSIC_CONCEPTS",
        title: "Missing selling price (Price on Request)",
        detail: `${p.name} has no basePrice or discountPrice set.`,
        entityName: p.name,
        skuOrSlug: p.sku || p.slug,
        publicUrl,
        adminEditUrl,
        suggestion: "Set Base/MRP Price and Selling Price if this is a ready-stock model.",
      });
    } else if (
      p.basePrice &&
      p.discountPrice &&
      p.discountPrice > p.basePrice
    ) {
      addIssue({
        severity: "CRITICAL",
        category: "PRICING_AND_SPECS",
        site: "CLASSIC_CONCEPTS",
        title: "Discount/Selling price is higher than Base MRP price",
        detail: `${p.name} has Selling Price ₹${p.discountPrice} > Base MRP ₹${p.basePrice}.`,
        entityName: p.name,
        skuOrSlug: p.sku || p.slug,
        publicUrl,
        adminEditUrl,
        suggestion: "Swap or update Base Price and Discount Price.",
      });
    }

    // 1d. Podium dimensions & range check
    if (p.isPodium) {
      const dims = (p.specifications || []).filter(
        (s) => s.type === "dimension"
      );
      const hasHeight = dims.some((d) => /height/i.test(d.name));
      const hasTop = dims.some((d) => /top|reading/i.test(d.name));
      if (!hasHeight || !hasTop) {
        addIssue({
          severity: "WARNING",
          category: "PRICING_AND_SPECS",
          site: "CLASSIC_CONCEPTS",
          title: `Podium missing ${!hasHeight && !hasTop ? "Height & Top Sheet" : !hasHeight ? "Height" : "Top Sheet"} dimensions`,
          detail: `${p.name} is marked as a podium but lacks ${!hasHeight && !hasTop ? "Height and Top Sheet" : !hasHeight ? "Height" : "Top Sheet"} dimension rows.`,
          entityName: p.name,
          skuOrSlug: p.sku || p.slug,
          publicUrl,
          adminEditUrl,
          suggestion: "Add Height and Top Sheet dimensions on the product page.",
        });
      }
      if (!p.podiumSubCategoryId) {
        addIssue({
          severity: "INFO",
          category: "TAXONOMY",
          site: "CLASSIC_CONCEPTS",
          title: "Podium not linked to a Podium Range",
          detail: `${p.name} is not assigned to Essential, Classic Signature, Premium, or Custom-Built Podiums.`,
          entityName: p.name,
          skuOrSlug: p.sku || p.slug,
          publicUrl,
          adminEditUrl,
          suggestion: "Assign a Podium Range in the Podium Editor.",
        });
      }
    }

    // 1e. HTML &nbsp; / em-dash / formatting artifacts check
    const rawHtmlCombined = `${p.description || ""} ${p.descriptionHtml || ""} ${p.importantNoteHtml || ""}`;
    if (/&nbsp;|&#160;|&#xa0;|\u00a0/i.test(rawHtmlCombined)) {
      addIssue({
        severity: "WARNING",
        category: "HTML_AND_CONTENT",
        site: "CLASSIC_CONCEPTS",
        title: "Non-breaking space (&nbsp;) chain in product description/notes",
        detail: `${p.name} contains raw &nbsp; entities in descriptionHtml or importantNoteHtml that can cause mobile text overflow.`,
        entityName: p.name,
        skuOrSlug: p.sku || p.slug,
        publicUrl,
        adminEditUrl,
        autoFixable: true,
        suggestion: "Click 'Auto-Clean HTML & Links' above to strip all &nbsp; entities.",
      });
    }
    if (/\u2014/.test(rawHtmlCombined)) {
      addIssue({
        severity: "INFO",
        category: "HTML_AND_CONTENT",
        site: "CLASSIC_CONCEPTS",
        title: "Em-dash (—) found in product copy",
        detail: `${p.name} contains em-dashes in its description or notes.`,
        entityName: p.name,
        skuOrSlug: p.sku || p.slug,
        publicUrl,
        adminEditUrl,
        autoFixable: true,
        suggestion: "Click 'Auto-Clean HTML & Links' to replace em-dashes with plain punctuation.",
      });
    }
  }

  // 1f. Duplicate SKUs
  for (const [sku, list] of skuMap.entries()) {
    if (list.length > 1) {
      addIssue({
        severity: "WARNING",
        category: "PRICING_AND_SPECS",
        site: "CLASSIC_CONCEPTS",
        title: `Duplicate SKU "${sku}" across ${list.length} products`,
        detail: `SKU "${sku}" is shared by: ${list.map((x) => `${x.name} (${x.slug})`).join(", ")}.`,
        entityName: sku,
        skuOrSlug: sku,
        publicUrl: `/shop/p/${list[0].slug}`,
        adminEditUrl: `/admin/products/${list[0].id}`,
        suggestion: "Give each product a unique SKU code.",
      });
    }
  }

  // 2. Useful Links, Resources & Certificates Link Audit
  for (const link of usefulLinks) {
    const u = (link.url || "").trim();
    if (!u || /localhost|127\.0\.0\.1|:300[0-9]/i.test(u)) {
      addIssue({
        severity: "CRITICAL",
        category: "LINKS_AND_CROSS_SITE",
        site: "CLASSIC_CONCEPTS",
        title: `Footer Useful Link "${link.title}" has broken/localhost URL`,
        detail: `UsefulLink "${link.title}" points to "${u || "(empty)"}".`,
        entityName: link.title,
        adminEditUrl: `/admin/useful-links/${link.id}`,
        autoFixable: /localhost|127\.0\.0\.1/i.test(u),
        suggestion: "Update the URL in Admin > Footer Useful Links.",
      });
    }
  }

  for (const resItem of resources) {
    const u = (resItem.fileUrl || "").trim();
    if (!u || /localhost|127\.0\.0\.1/i.test(u)) {
      addIssue({
        severity: "CRITICAL",
        category: "LINKS_AND_CROSS_SITE",
        site: "CLASSIC_CONCEPTS",
        title: `Resource / Brochure "${resItem.title}" has missing or localhost fileUrl`,
        detail: `Resource "${resItem.title}" has fileUrl="${u || "(empty)"}".`,
        entityName: resItem.title,
        adminEditUrl: `/admin/resources/${resItem.id}`,
        suggestion: "Upload the PDF brochure to R2 storage in Admin > Catalogs & Resources.",
      });
    }
  }

  for (const cert of certificates) {
    const u = (cert.imageUrl || "").trim();
    if (!u || /localhost|127\.0\.0\.1/i.test(u)) {
      addIssue({
        severity: "WARNING",
        category: "LINKS_AND_CROSS_SITE",
        site: "CLASSIC_CONCEPTS",
        title: `Certificate "${cert.title}" has missing or localhost imageUrl`,
        detail: `Certificate "${cert.title}" has imageUrl="${u || "(empty)"}".`,
        entityName: cert.title,
        adminEditUrl: `/admin/certificates/${cert.id}`,
        suggestion: "Re-upload the certificate image in Admin > Certificates.",
      });
    }
  }

  // 3. Empty Categories check
  for (const cat of categories) {
    if (cat._count.products === 0) {
      addIssue({
        severity: "INFO",
        category: "TAXONOMY",
        site: "CLASSIC_CONCEPTS",
        title: `Category "${cat.name}" has 0 products`,
        detail: `Category "/shop/c/${cat.slug}" currently has no products assigned.`,
        entityName: cat.name,
        publicUrl: `/shop/c/${cat.slug}`,
        adminEditUrl: `/admin/categories/${cat.id}`,
        suggestion: "Assign products to this category or remove it if unused.",
      });
    }
  }

  const sevRank: Record<IssueSeverity, number> = {
    CRITICAL: 0,
    WARNING: 1,
    INFO: 2,
  };
  issues.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  const critical = issues.filter((i) => i.severity === "CRITICAL").length;
  const warning = issues.filter((i) => i.severity === "WARNING").length;
  const info = issues.filter((i) => i.severity === "INFO").length;
  const autoFixableCount = issues.filter((i) => i.autoFixable).length;
  const healthScore = Math.max(
    0,
    Math.min(100, Math.round(100 - critical * 8 - warning * 1.5 - info * 0.25))
  );

  let acrioAnalysis: string | null = null;
  if (askPrompt && askPrompt.trim()) {
    const digest = issues
      .slice(0, 50)
      .map(
        (i, idx) =>
          `${idx + 1}. [${i.severity} | ${i.category}] ${i.title} - ${i.detail}`
      )
      .join("\n");
    const aiRes = await callClaudeHaiku({
      scope: "admin",
      useCatalogSystemCache: false,
      maxTokens: 2048,
      taskSystemInstruction:
        "You are ACRIO Issues Identifier (Dev Mode) for Classic Concepts. Write in simple everyday English with zero em-dashes and zero AI filler. Group findings clearly with concrete steps to resolve each issue.",
      userPrompt: `Ecosystem Audit Summary:
- Health Score: ${healthScore}%
- Products Scanned: ${products.length}
- Categories Scanned: ${categories.length}
- Useful Links & Resources Scanned: ${usefulLinks.length + resources.length}
- Total Issues Found: ${issues.length} (Critical: ${critical}, Warning: ${warning}, Info: ${info})

Issues List:
${digest || "No issues detected."}

Developer Question:
${askPrompt.trim()}`,
    });
    if (aiRes.text) {
      acrioAnalysis = aiRes.text.replace(/\u2014/g, ", ").replace(/--+/g, ", ");
    }
  }

  return {
    scannedAtIso: new Date().toISOString(),
    durationMs: Date.now() - started,
    healthScore,
    totals: {
      totalIssues: issues.length,
      critical,
      warning,
      info,
      autoFixableCount,
      productsScanned: products.length,
      categoriesScanned: categories.length,
      podiumRangesScanned: podiumSubCategories.length,
      linksAndResourcesScanned:
        usefulLinks.length + resources.length + certificates.length,
    },
    issues,
    acrioAnalysis,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runClassicConceptsEcosystemAudit();
    return NextResponse.json({ ok: true, report });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Audit failed." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "auto_clean_db") {
      const products = await prisma.product.findMany({
        select: {
          id: true,
          description: true,
          descriptionHtml: true,
          importantNoteHtml: true,
        },
      });
      const cleanStr = (s: string | null) =>
        s
          ? s
              .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
              .replace(/\u00a0/g, " ")
              .replace(/\u2014/g, ", ")
              .replace(/\s+\u2013\s+/g, ", ")
          : s;

      let cleanedCount = 0;
      for (const p of products) {
        const d = cleanStr(p.description);
        const dh = cleanStr(p.descriptionHtml);
        const inh = cleanStr(p.importantNoteHtml);
        if (
          d !== p.description ||
          dh !== p.descriptionHtml ||
          inh !== p.importantNoteHtml
        ) {
          await prisma.product.update({
            where: { id: p.id },
            data: {
              description: d,
              descriptionHtml: dh,
              importantNoteHtml: inh,
            },
          });
          cleanedCount++;
        }
      }

      invalidateAiCatalogCache();
      await invalidateCacheTags(["catalog", "taxonomy", "ai-snapshot"], {
        skipRevalidatePath: true,
        warm: false,
      });
      const report = await runClassicConceptsEcosystemAudit();
      return NextResponse.json({
        ok: true,
        message: `Cleaned HTML &nbsp; and formatting discrepancies across ${cleanedCount} product(s) and refreshed the catalog cache.`,
        cleanedCount,
        report,
      });
    }

    if (action === "ask_acrio") {
      const prompt = String(body.prompt || "").trim();
      const report = await runClassicConceptsEcosystemAudit(prompt);
      return NextResponse.json({ ok: true, report });
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Action failed" },
      { status: 500 }
    );
  }
}
