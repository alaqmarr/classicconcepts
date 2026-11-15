import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildDeterministicSeoMetadata,
  callClaudeHaiku,
  extractVerifiedAdminFacts,
  runAdminDraftEnquiryReply,
  runAdminInlineRewrite,
  runAdminProductAutofill,
  sanitizeAdminUntrustedInput,
} from "@/lib/ai";
import {
  getAiRuntimeSettings,
  getKnowledgeSnapshot,
  invalidateAiCatalogCache,
  invalidateAiSettingsCache,
} from "@/lib/ai-context";
import {
  bulletsToCleanHtml,
  bulletsToPlainSummary,
  extractBulletsFromContent,
} from "@/lib/bullet-formatter";
import { revalidateCatalogPaths } from "@/lib/product-mutations";
import { invalidateCacheTags } from "@/lib/redis-cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "test_connection") {
      await invalidateCacheTags(["settings"], { skipRevalidatePath: true, warm: false });
      invalidateAiSettingsCache();
      const requestedScope = body?.scope === "client" ? "client" : "admin";
      const startedAt = Date.now();
      const snapshot = await getKnowledgeSnapshot();
      const cacheCount = await prisma.aiResponseCache.count().catch(() => 0);

      const res = await callClaudeHaiku({
        scope: requestedScope,
        useCatalogSystemCache: true,
        maxTokens: 80,
        temperature: 0,
        taskSystemInstruction:
          requestedScope === "client"
            ? "Reply in one short sentence confirming ACRIO (Classic Concepts Client Assistant on claude-haiku-5-5) and the Catalog Cache are online."
            : "Reply in one short sentence confirming ACRO (Classic Concepts Admin Co-Pilot on claude-haiku-5-5) and the Catalog Cache are online.",
        userPrompt: "Ping status check.",
      });

      return NextResponse.json({
        ok: res.ok,
        scope: requestedScope,
        agentName: res.agentName,
        reply: res.text,
        modelUsed: res.modelUsed,
        latencyMs: Date.now() - startedAt,
        usage: res.usage,
        catalogProductsCount: snapshot.products.length,
        catalogHash: snapshot.catalogHash,
        cachedQueryResponses: cacheCount,
        error: res.error,
      });
    }

    if (action === "refresh_cache") {
      if (body?.clearResponseCache) {
        await prisma.aiResponseCache.deleteMany({}).catch(() => {});
      }
      await invalidateCacheTags(
        body?.clearResponseCache
          ? ["ai-responses", "ai-snapshot", "catalog"]
          : ["ai-snapshot", "catalog"]
      );
      invalidateAiCatalogCache();
      const snapshot = await getKnowledgeSnapshot();
      const cacheCount = await prisma.aiResponseCache.count().catch(() => 0);
      return NextResponse.json({
        ok: true,
        catalogProductsCount: snapshot.products.length,
        catalogHash: snapshot.catalogHash,
        cachedQueryResponses: cacheCount,
      });
    }

    if (action === "inline_rewrite") {
      const requestedMode = body?.mode || body?.format;
      const currentTextStr = String(body?.currentText || "");
      const hasRichMarkup = /<(span|strong|b|em|i|u|ul|ol|li|p|br)\b/i.test(currentTextStr);
      const resolvedMode =
        requestedMode === "bullets"
          ? "bullets"
          : requestedMode === "html" || (hasRichMarkup && requestedMode !== "plain_strict")
          ? "html"
          : "plain";

      const res = await runAdminInlineRewrite({
        currentText: currentTextStr,
        instruction: String(body?.instruction || ""),
        mode: resolvedMode,
        fieldLabel: body?.fieldLabel
          ? String(body.fieldLabel)
          : body?.contextHint
          ? String(body.contextHint)
          : undefined,
      });
      return NextResponse.json({
        ...res,
        source: res.warning ? "smart-local" : "ai",
      });
    }

    if (action === "product_autofill") {
      const snapshot = await getKnowledgeSnapshot();
      const res = await runAdminProductAutofill({
        name: String(body?.name || ""),
        categoryName: body?.categoryName ? String(body.categoryName) : undefined,
        isPodium: Boolean(body?.isPodium),
        sku: body?.sku ? String(body.sku) : undefined,
        existingDescription: body?.existingDescription ? String(body.existingDescription) : undefined,
        existingSpecs: Array.isArray(body?.existingSpecs) ? body.existingSpecs : undefined,
        customNotes: body?.customNotes ? String(body.customNotes) : undefined,
      });

      if (!res.ok || !res.data) {
        return NextResponse.json(res);
      }

      // Map suggested industry / problem names to DB IDs for instant checkbox selection
      const matchedIndustryIds = snapshot.industries
        .filter((ind) =>
          res.data!.suggestedIndustries?.some(
            (name) =>
              name.toLowerCase() === ind.name.toLowerCase() ||
              ind.name.toLowerCase().includes(name.toLowerCase())
          )
        )
        .map((i) => i.id);

      const matchedProblemIds = snapshot.problemStatements
        .filter((ps) =>
          res.data!.suggestedProblems?.some(
            (name) =>
              name.toLowerCase() === ps.name.toLowerCase() ||
              ps.name.toLowerCase().includes(name.toLowerCase())
          )
        )
        .map((p) => p.id);

      return NextResponse.json({
        ok: true,
        agentName: res.agentName || "ACRO (Admin Co-Pilot)",
        warning: res.warning,
        injectionWarning: res.injectionWarning,
        data: {
          ...res.data,
          matchedIndustryIds,
          matchedProblemIds,
        },
      });
    }

    if (action === "seo_generate") {
      const sanitizedName = sanitizeAdminUntrustedInput(String(body?.name || ""));
      if (!sanitizedName.sanitized) {
        return NextResponse.json(
          { ok: false, error: "Please enter a product name first." },
          { status: 400 }
        );
      }
      const verifiedFacts = extractVerifiedAdminFacts({
        name: sanitizedName.sanitized,
        sku: body?.sku ? String(body.sku) : undefined,
        existingDescription: body?.existingDescription ? String(body.existingDescription) : undefined,
        existingSpecs: Array.isArray(body?.existingSpecs) ? body.existingSpecs : undefined,
        customNotes: body?.customNotes ? String(body.customNotes) : undefined,
      });
      const seo = buildDeterministicSeoMetadata({
        name: sanitizedName.sanitized,
        categoryName: body?.categoryName ? String(body.categoryName) : undefined,
        isPodium: Boolean(body?.isPodium),
        sku: body?.sku ? String(body.sku) : undefined,
        verifiedFacts,
      });
      return NextResponse.json({
        ok: true,
        agentName: "ACRO (Admin Co-Pilot)",
        previewOnly: true,
        data: {
          ...seo,
          missingAttributesWarning: verifiedFacts.missingAttributesWarning,
          groundingStatus:
            verifiedFacts.missingAttributesWarning.length === 0
              ? "VERIFIED_INPUTS"
              : "NEEDS_ADMIN_CONFIRMATION",
          fieldDiffPreview: {
            seoTitle: { current: String(body?.currentSeoTitle || ""), proposed: seo.seoTitle },
            metaDescription: {
              current: String(body?.currentMetaDescription || ""),
              proposed: seo.metaDescription,
            },
            searchKeywords: {
              current: String(body?.currentSearchKeywords || ""),
              proposed: seo.searchKeywords,
            },
          },
        },
      });
    }

    if (action === "preview_bulletize_products" || action === "bulletize_products") {
      const rawIds: string[] = Array.isArray(body?.productIds)
        ? body.productIds.map(String).filter(Boolean).slice(0, 15)
        : [];

      if (rawIds.length === 0) {
        return NextResponse.json({ ok: false, error: "No products selected." }, { status: 400 });
      }

      // Safety rule: NEVER write to DB unless action is explicitly confirmed or using apply_approved_bullets
      const shouldCommitDirectly =
        action === "bulletize_products" && body?.confirmed === true;

      const settings = await getAiRuntimeSettings();
      const useAi = Boolean(settings.adminApiKey && settings.aiEnabled);

      const products = await prisma.product.findMany({
        where: { id: { in: rawIds } },
        include: {
          category: { select: { name: true } },
          specifications: { take: 6 },
          features: { take: 6 },
        },
      });

      let updatedCount = 0;
      let usedAiCount = 0;
      const previewItems: Array<{
        id: string;
        name: string;
        sku: string | null;
        categoryName: string;
        currentBullets: string[];
        proposedBullets: string[];
        usedAi: boolean;
      }> = [];

      for (const p of products) {
        const currentBullets = extractBulletsFromContent(
          p.descriptionHtml,
          p.description
        );
        let bullets: string[] = [];
        let itemUsedAi = false;

        if (useAi) {
          const sourceText = [
            p.description || "",
            p.descriptionHtml || "",
            p.features.map((f) => f.text).join("; "),
            p.specifications.map((s) => `${s.name}: ${s.value}`).join("; "),
          ]
            .filter(Boolean)
            .join("\n");

          const aiResult = await runAdminInlineRewrite({
            currentText: sourceText || `${p.name} (${p.category.name})`,
            instruction: `Convert this product ("${p.name}" in category "${p.category.name}") into 5 simple, easy-to-understand layman bullet points starting with clear labels like "Material:", "Build & Finish:", "Easy to Use:", "Custom Options:", and "Best Used For:". Avoid em dashes and avoid fancy words like bespoke or optical-grade. Keep any real measurements.`,
            mode: "bullets",
            fieldLabel: `Product Description (${p.name})`,
          });

          if (aiResult.ok && aiResult.bullets && aiResult.bullets.length > 0) {
            bullets = aiResult.bullets;
            if (!aiResult.warning) {
              usedAiCount++;
              itemUsedAi = true;
            }
          }
        }

        if (bullets.length === 0) {
          bullets = [...currentBullets];
          if (bullets.length === 0) {
            bullets = [
              `Product: ${p.name} made directly by Classic Concepts (${p.category.name}).`,
              "Material: Made from thick, glass-clear imported acrylic that stays clear and does not turn yellow.",
              "Build & Finish: Smooth, shiny polished edges with a strong, long-lasting build.",
              "Custom Options: Custom sizes and color-printed or engraved logos are available on request.",
            ];
          }
        }

        previewItems.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          categoryName: p.category.name,
          currentBullets,
          proposedBullets: bullets,
          usedAi: itemUsedAi,
        });

        if (shouldCommitDirectly) {
          await prisma.product.update({
            where: { id: p.id },
            data: {
              descriptionHtml: bulletsToCleanHtml(bullets),
              description: bulletsToPlainSummary(bullets, 4),
            },
          });
          updatedCount++;
        }
      }

      if (shouldCommitDirectly) {
        await invalidateCacheTags(["catalog", "ai-snapshot", "ai-responses"]);
        revalidateCatalogPaths();
      }

      return NextResponse.json({
        ok: true,
        previewOnly: !shouldCommitDirectly,
        items: previewItems,
        updatedCount,
        usedAiCount,
        mode: usedAiCount > 0 ? "ai" : "smart-formatter",
      });
    }

    if (action === "apply_approved_bullets") {
      const rawUpdates = Array.isArray(body?.updates) ? body.updates : [];
      const cleanUpdates = rawUpdates
        .map((u: any) => ({
          productId: String(u?.productId || "").trim(),
          bullets: Array.isArray(u?.bullets)
            ? u.bullets.map((b: any) => String(b || "").trim()).filter(Boolean)
            : [],
        }))
        .filter((u: { productId: string; bullets: string[] }) => u.productId && u.bullets.length > 0);

      if (cleanUpdates.length === 0) {
        return NextResponse.json(
          { ok: false, error: "No approved product bullet updates provided." },
          { status: 400 }
        );
      }

      await prisma.$transaction(
        cleanUpdates.map((u: { productId: string; bullets: string[] }) =>
          prisma.product.update({
            where: { id: u.productId },
            data: {
              descriptionHtml: bulletsToCleanHtml(u.bullets),
              description: bulletsToPlainSummary(u.bullets, 4),
              subCategories: undefined,
            },
          })
        )
      );

      await invalidateCacheTags(["catalog", "ai-snapshot", "ai-responses"]);
      revalidateCatalogPaths();

      return NextResponse.json({
        ok: true,
        updatedCount: cleanUpdates.length,
      });
    }

    if (action === "draft_enquiry_reply") {
      const res = await runAdminDraftEnquiryReply({
        customerName: String(body?.customerName || "Valued Customer"),
        customerMessage: String(body?.customerMessage || ""),
        source: body?.source ? String(body.source) : undefined,
        tone: body?.tone ? String(body.tone) : undefined,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ ok: false, error: "Unknown AI action." }, { status: 400 });
  } catch (err: any) {
    console.error("Admin AI route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to execute AI task." },
      { status: 500 }
    );
  }
}
