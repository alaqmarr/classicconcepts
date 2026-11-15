import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { invalidateAiCatalogCache } from "@/lib/ai-context";
import { invalidateCacheTags } from "@/lib/redis-cache";
import { notifyWhatsAppHubCatalogSync } from "@/lib/whatsapp-bridge";
import {
  bulletsToCleanHtml,
  bulletsToPlainSummary,
  ensureBulletHtml,
} from "@/lib/bullet-formatter";
import {
  parseVideoUrlEntries,
  serializeVideoUrlEntries,
} from "@/lib/youtube";

export function normalizeSlug(raw: string, fallbackPrefix = "item"): string {
  const base = slugify(raw || "", { lower: true, strict: true }).trim();
  return base || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

/**
 * Strips empty Quill markup (`<p><br></p>`) and removes accidental multi-MB base64 data:image embeds
 * so SQLite and Node.js heap never choke on pasted rich clipboard blobs.
 */
export function sanitizeRichHtml(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Remove embedded base64 data URIs on <img> tags if pasted from clipboard
  const withoutBase64Images = raw.replace(
    /<img[^>]+src=["']data:image\/[^"']+["'][^>]*>/gi,
    ""
  );
  const stripped = withoutBase64Images
    .replace(/<p>(\s|<br\s*\/?>|&nbsp;)*<\/p>/gi, "")
    .trim();
  if (!stripped) return null;
  return withoutBase64Images.trim();
}

export async function generateUniqueProductSlug(
  rawName: string,
  excludeId?: string
): Promise<string> {
  const base = normalizeSlug(rawName, "product");
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
}

export async function generateUniqueCategorySlug(
  rawName: string,
  excludeId?: string
): Promise<string> {
  const base = normalizeSlug(rawName, "category");
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
}

export async function generateUniqueSubCategorySlug(
  rawName: string,
  excludeId?: string
): Promise<string> {
  const base = normalizeSlug(rawName, "sub");
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.subCategory.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
}

export async function generateUniqueIndustrySlug(
  rawName: string,
  excludeId?: string
): Promise<string> {
  const base = normalizeSlug(rawName, "industry");
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.industry.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
}

export async function generateUniqueProblemSlug(
  rawName: string,
  excludeId?: string
): Promise<string> {
  const base = normalizeSlug(rawName, "solution");
  let candidate = base;
  let counter = 2;

  while (true) {
    const existing = await prisma.problemStatement.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || (excludeId && existing.id === excludeId)) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
}

export function revalidateCatalogPaths(slug?: string) {
  invalidateAiCatalogCache();
  void invalidateCacheTags(
    ["catalog", "taxonomy", "ai-snapshot", "ai-responses"],
    { paths: slug ? [`/shop/p/${slug}`] : undefined }
  );
  void notifyWhatsAppHubCatalogSync(slug ? `product:${slug}` : "catalog_mutation");
  try {
    revalidatePath("/", "layout");
    revalidatePath("/shop");
    revalidatePath("/shop/c");
    revalidatePath("/shop/c/[slug]", "page");
    revalidatePath("/shop/industry");
    revalidatePath("/shop/industry/[slug]", "page");
    revalidatePath("/shop/problem");
    revalidatePath("/shop/problem/[slug]", "page");
    revalidatePath("/podiums");
    revalidatePath("/podiums/[slug]", "page");
    if (slug) {
      revalidatePath(`/shop/p/${slug}`);
    } else {
      revalidatePath("/shop/p/[slug]", "page");
    }
    revalidatePath("/sitemap.xml");
    revalidatePath("/admin/products");
    revalidatePath("/admin/podiums");
  } catch {
    // Safe fallback when invoked from CLI scripts outside Next.js request context
  }
}

interface ParsedProductPayload {
  name: string;
  categoryId: string;
  subCategoryIds: string[];
  newSubCategories: string[];
  sku: string | null;
  podiumSubCategoryIds: string[];
  newPodiumSubCategories: string[];
  designRegistrationNo: string | null;
  ipProtectionText: string | null;
  basePrice: number | null;
  discountPrice: number | null;
  stockStatus: string;
  discountBadge: string | null;
  videoUrl: string | null;
  description: string | null;
  descriptionHtml: string | null;
  importantNoteHtml: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  searchKeywords: string | null;
  imageCreates: { url: string; isMain: boolean }[];
  featureCreates: { text: string }[];
  specCreates: { name: string; value: string; type: string }[];
  variantCreates: {
    name: string;
    price: number | null;
    imageUrl: string | null;
    images?: { create: { url: string }[] };
  }[];
  problemStatementIds: string[];
  newProblemStatements: string[];
  industryIds: string[];
  newIndustries: string[];
}

function splitCommaNames(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

export function parseProductFormData(formData: FormData): {
  data?: ParsedProductPayload;
  error?: string;
} {
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) {
    return { error: "Product name is required." };
  }

  const categoryId = ((formData.get("categoryId") as string) || "").trim();
  if (!categoryId) {
    return { error: "Please select a category." };
  }

  const rawSku = ((formData.get("sku") as string) || "").trim();
  const sku = rawSku.length > 0 ? rawSku : null;

  const singleSubId =
    ((formData.get("subCategoryId") as string) || "").trim() || null;
  const multiSubIds = [
    ...(formData.getAll("subCategoryIds[]") as string[]),
    ...(formData.getAll("subCategoryIds") as string[]),
  ]
    .map((id) => (id || "").trim())
    .filter(Boolean);
  const subCategoryIds = Array.from(
    new Set([...(multiSubIds.length > 0 ? multiSubIds : singleSubId ? [singleSubId] : [])])
  );
  const newSubCategories = splitCommaNames(
    formData.get("newSubCategory") as string | null
  );

  const singlePodiumSubId =
    ((formData.get("podiumSubCategoryId") as string) || "").trim() || null;
  const multiPodiumSubIds = (formData.getAll("podiumSubCategoryIds[]") as string[])
    .map((id) => (id || "").trim())
    .filter(Boolean);
  const podiumSubCategoryIds = Array.from(
    new Set([
      ...(multiPodiumSubIds.length > 0
        ? multiPodiumSubIds
        : singlePodiumSubId
        ? [singlePodiumSubId]
        : []),
    ])
  );
  const newPodiumSubCategories = splitCommaNames(
    formData.get("newPodiumSubCategory") as string | null
  );

  const designRegistrationNo =
    ((formData.get("designRegistrationNo") as string) || "").trim() || null;
  const ipProtectionText =
    ((formData.get("ipProtectionText") as string) || "").trim() || null;

  const bpRaw = ((formData.get("basePrice") as string) || "").trim();
  const bpParsed = bpRaw ? parseFloat(bpRaw) : NaN;
  const basePrice = Number.isFinite(bpParsed) && bpParsed >= 0 ? bpParsed : null;

  const dpRaw = ((formData.get("discountPrice") as string) || "").trim();
  const dpParsed = dpRaw ? parseFloat(dpRaw) : NaN;
  const discountPrice = Number.isFinite(dpParsed) && dpParsed >= 0 ? dpParsed : null;

  const stockStatus =
    ((formData.get("stockStatus") as string) || "").trim() || "In stock";
  const discountBadge =
    ((formData.get("discountBadge") as string) || "").trim() || null;
  const rawVideoUrl = (formData.get("videoUrl") as string) || "";
  const videoUrl = serializeVideoUrlEntries(parseVideoUrlEntries(rawVideoUrl));

  // Support structured bullet-point description inputs alongside HTML/summary
  const descriptionBullets = (formData.getAll("descriptionBullet[]") as string[])
    .map((b) => (b || "").trim())
    .filter(Boolean);

  const rawDescription = ((formData.get("description") as string) || "").trim() || null;
  const rawDescriptionHtml = sanitizeRichHtml(
    formData.get("descriptionHtml") as string | null
  );

  let descriptionHtml: string | null = null;
  let description: string | null = rawDescription;

  if (descriptionBullets.length > 0) {
    descriptionHtml = bulletsToCleanHtml(descriptionBullets);
    description = rawDescription || bulletsToPlainSummary(descriptionBullets, 4);
    if (formData.get("syncDescriptionFromBullets") === "true") {
      description = bulletsToPlainSummary(descriptionBullets, 4);
    }
  } else if (rawDescriptionHtml) {
    descriptionHtml = /<(ul|ol)\b/i.test(rawDescriptionHtml)
      ? rawDescriptionHtml
      : ensureBulletHtml(rawDescriptionHtml) || rawDescriptionHtml;
  } else if (rawDescription) {
    descriptionHtml = ensureBulletHtml(rawDescription);
  }

  const importantNoteHtml = sanitizeRichHtml(
    formData.get("importantNoteHtml") as string | null
  );

  const seoTitle =
    ((formData.get("seoTitle") as string) || "").trim() || null;
  const metaDescription =
    ((formData.get("metaDescription") as string) || "").trim() || null;
  const searchKeywords =
    ((formData.get("searchKeywords") as string) || "").trim() || null;

  const mainImage = ((formData.get("mainImage") as string) || "").trim() || null;
  const galleryImages = (formData.getAll("galleryImages[]") as string[])
    .map((u) => (u || "").trim())
    .filter(Boolean);

  const imageCreates: { url: string; isMain: boolean }[] = [];
  if (mainImage) {
    imageCreates.push({ url: mainImage, isMain: true });
  }
  for (const gUrl of galleryImages) {
    if (gUrl !== mainImage) {
      imageCreates.push({ url: gUrl, isMain: imageCreates.length === 0 });
    }
  }

  const featureCreates = (formData.getAll("featureText[]") as string[])
    .map((t) => (t || "").trim())
    .filter(Boolean)
    .map((text) => ({ text }));

  const specNames = formData.getAll("specName[]") as string[];
  const specValues = formData.getAll("specValue[]") as string[];
  const specTypes = formData.getAll("specType[]") as string[];
  const specCreates: { name: string; value: string; type: string }[] = [];

  for (let i = 0; i < specNames.length; i++) {
    const sName = (specNames[i] || "").trim();
    const sVal = (specValues[i] || "").trim();
    if (!sName || !sVal) continue;
    specCreates.push({
      name: sName,
      value: sVal,
      type: specTypes[i] === "dimension" ? "dimension" : "specification",
    });
  }

  // Use stable variantKeys[] so deleting/reordering variants in the UI never mismatches images
  const variantKeys = formData.getAll("variantKey[]") as string[];
  const variantNames = formData.getAll("variantName[]") as string[];
  const variantPrices = formData.getAll("variantPrice[]") as string[];
  const variantCreates: ParsedProductPayload["variantCreates"] = [];

  for (let i = 0; i < variantNames.length; i++) {
    const vName = (variantNames[i] || "").trim();
    if (!vName) continue;

    const vKey = variantKeys[i] !== undefined ? variantKeys[i] : String(i);
    const vpRaw = (variantPrices[i] || "").trim();
    const vpParsed = vpRaw ? parseFloat(vpRaw) : NaN;
    const price = Number.isFinite(vpParsed) && vpParsed >= 0 ? vpParsed : null;

    const imageUrl =
      ((formData.get(`variantImage_${vKey}`) as string) ||
        (formData.get(`variantImage_${i}`) as string) ||
        "").trim() || null;

    const rawVarGallery =
      formData.getAll(`variantGallery_${vKey}[]`).length > 0
        ? (formData.getAll(`variantGallery_${vKey}[]`) as string[])
        : (formData.getAll(`variantGallery_${i}[]`) as string[]);

    const galleryUrls = rawVarGallery.map((u) => (u || "").trim()).filter(Boolean);

    variantCreates.push({
      name: vName,
      price,
      imageUrl,
      images:
        galleryUrls.length > 0
          ? { create: galleryUrls.map((url) => ({ url })) }
          : undefined,
    });
  }

  const problemStatementIds = Array.from(
    new Set(
      [
        ...(formData.getAll("problemStatements[]") as string[]),
        ...(formData.getAll("problemStatements") as string[]),
      ]
        .map((id) => (id || "").trim())
        .filter(Boolean)
    )
  );
  const newProblemStatements = splitCommaNames(
    formData.get("newProblemStatements") as string | null
  );

  const industryIds = Array.from(
    new Set(
      [
        ...(formData.getAll("industries[]") as string[]),
        ...(formData.getAll("industries") as string[]),
      ]
        .map((id) => (id || "").trim())
        .filter(Boolean)
    )
  );
  const newIndustries = splitCommaNames(
    formData.get("newIndustries") as string | null
  );

  return {
    data: {
      name,
      categoryId,
      subCategoryIds,
      newSubCategories,
      sku,
      podiumSubCategoryIds,
      newPodiumSubCategories,
      designRegistrationNo,
      ipProtectionText,
      basePrice,
      discountPrice,
      stockStatus,
      discountBadge,
      videoUrl,
      description,
      descriptionHtml,
      importantNoteHtml,
      seoTitle,
      metaDescription,
      searchKeywords,
      imageCreates,
      featureCreates,
      specCreates,
      variantCreates,
      problemStatementIds,
      newProblemStatements,
      industryIds,
      newIndustries,
    },
  };
}

async function resolveMultiRelationsInTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  d: ParsedProductPayload
) {
  // 1. SubCategories (must belong to d.categoryId)
  const validSubs =
    d.subCategoryIds.length > 0
      ? await tx.subCategory.findMany({
          where: { id: { in: d.subCategoryIds }, categoryId: d.categoryId },
          select: { id: true },
        })
      : [];
  const subIds = validSubs.map((s) => s.id);
  for (const newName of d.newSubCategories) {
    const genSubSlug = normalizeSlug(newName, "sub");
    const genSub = await tx.subCategory.upsert({
      where: { slug: genSubSlug },
      update: { name: newName, categoryId: d.categoryId },
      create: {
        name: newName,
        slug: genSubSlug,
        categoryId: d.categoryId,
      },
    });
    if (!subIds.includes(genSub.id)) subIds.push(genSub.id);
  }

  // 2. Podium Sub-Categories
  const validPodiumSubs =
    d.podiumSubCategoryIds.length > 0
      ? await tx.podiumSubCategory.findMany({
          where: { id: { in: d.podiumSubCategoryIds } },
          select: { id: true },
        })
      : [];
  const podiumSubIds = validPodiumSubs.map((s) => s.id);
  for (const newPodiumSubName of d.newPodiumSubCategories) {
    const subSlug = normalizeSlug(newPodiumSubName, "podium-sub");
    const sub = await tx.podiumSubCategory.upsert({
      where: { slug: subSlug },
      update: { name: newPodiumSubName },
      create: { name: newPodiumSubName, slug: subSlug },
    });
    if (!podiumSubIds.includes(sub.id)) podiumSubIds.push(sub.id);
  }

  // 3. Problem Statements (Product Use Cases & Applications)
  const validProblems =
    d.problemStatementIds.length > 0
      ? await tx.problemStatement.findMany({
          where: { id: { in: d.problemStatementIds } },
          select: { id: true },
        })
      : [];
  const problemIds = validProblems.map((p) => p.id);
  for (const newUseCase of d.newProblemStatements) {
    const psSlug = normalizeSlug(newUseCase, "use-case");
    const ps = await tx.problemStatement.upsert({
      where: { slug: psSlug },
      update: { name: newUseCase },
      create: { name: newUseCase, slug: psSlug },
    });
    if (!problemIds.includes(ps.id)) problemIds.push(ps.id);
  }

  // 4. Industries & Venues
  const validIndustries =
    d.industryIds.length > 0
      ? await tx.industry.findMany({
          where: { id: { in: d.industryIds } },
          select: { id: true },
        })
      : [];
  const industryIds = validIndustries.map((i) => i.id);
  for (const newIndName of d.newIndustries) {
    const indSlug = normalizeSlug(newIndName, "industry");
    const ind = await tx.industry.upsert({
      where: { slug: indSlug },
      update: { name: newIndName },
      create: { name: newIndName, slug: indSlug },
    });
    if (!industryIds.includes(ind.id)) industryIds.push(ind.id);
  }

  return {
    subIds,
    primarySubId: subIds[0] || null,
    podiumSubIds,
    primaryPodiumSubId: podiumSubIds[0] || null,
    problemIds,
    industryIds,
  };
}

export async function createCatalogItem(
  formData: FormData,
  options: { isPodium: boolean }
): Promise<{ success?: boolean; slug?: string; id?: string; error?: string }> {
  try {
    await requireAdminSession();

    const parsed = parseProductFormData(formData);
    if (parsed.error || !parsed.data) {
      return { error: parsed.error || "Invalid form data." };
    }
    const d = parsed.data;

    // Validate category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: d.categoryId },
      select: { id: true },
    });
    if (!categoryExists) {
      return { error: "Selected category no longer exists. Please refresh and choose a valid category." };
    }

    // Friendly SKU uniqueness check before touching DB
    if (d.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: d.sku },
        select: { id: true, name: true },
      });
      if (existingSku) {
        return {
          error: `SKU "${d.sku}" is already used by "${existingSku.name}". Please enter a unique SKU or leave it blank.`,
        };
      }
    }

    const slug = await generateUniqueProductSlug(d.name);

    const created = await prisma.$transaction(async (tx) => {
      const rels = await resolveMultiRelationsInTx(tx, d);

      const rawIsPodium = formData.get("isPodium");
      const finalIsPodium =
        rawIsPodium !== null
          ? String(rawIsPodium).toLowerCase() === "true"
          : options.isPodium;

      return tx.product.create({
        data: {
          name: d.name,
          slug,
          sku: d.sku,
          categoryId: d.categoryId,
          subCategoryId: rels.primarySubId,
          subCategories:
            rels.subIds.length > 0
              ? { connect: rels.subIds.map((id) => ({ id })) }
              : undefined,
          isPodium: finalIsPodium,
          podiumSubCategoryId: rels.primaryPodiumSubId,
          podiumSubCategories:
            rels.podiumSubIds.length > 0
              ? { connect: rels.podiumSubIds.map((id) => ({ id })) }
              : undefined,
          designRegistrationNo: d.designRegistrationNo,
          ipProtectionText: d.ipProtectionText,
          basePrice: d.basePrice,
          discountPrice: d.discountPrice,
          stockStatus: d.stockStatus,
          discountBadge: d.discountBadge,
          videoUrl: d.videoUrl,
          description: d.description,
          descriptionHtml: d.descriptionHtml,
          importantNoteHtml: d.importantNoteHtml,
          seoTitle: d.seoTitle,
          metaDescription: d.metaDescription,
          searchKeywords: d.searchKeywords,
          images: d.imageCreates.length > 0 ? { create: d.imageCreates } : undefined,
          features: d.featureCreates.length > 0 ? { create: d.featureCreates } : undefined,
          specifications: d.specCreates.length > 0 ? { create: d.specCreates } : undefined,
          variants: d.variantCreates.length > 0 ? { create: d.variantCreates } : undefined,
          problemStatements:
            rels.problemIds.length > 0
              ? { connect: rels.problemIds.map((id) => ({ id })) }
              : undefined,
          industries:
            rels.industryIds.length > 0
              ? { connect: rels.industryIds.map((id) => ({ id })) }
              : undefined,
        },
        select: { id: true, slug: true },
      });
    });

    await invalidateCacheTags(
      ["catalog", "taxonomy", "ai-snapshot", "ai-responses"],
      { paths: [`/shop/p/${created.slug}`] }
    );
    revalidateCatalogPaths(created.slug);
    return { success: true, id: created.id, slug: created.slug };
  } catch (err: any) {
    console.error("createCatalogItem error:", err);
    if (err?.code === "P2002") {
      return {
        error: "A product with a conflicting unique field (SKU or URL slug) already exists.",
      };
    }
    return { error: err?.message || "Failed to save product. Please try again." };
  }
}

export async function updateCatalogItem(
  id: string,
  formData: FormData,
  options?: { forceIsPodium?: boolean }
): Promise<{ success?: boolean; slug?: string; error?: string }> {
  try {
    await requireAdminSession();

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true, isPodium: true },
    });
    if (!existingProduct) {
      return { error: "Product not found." };
    }

    const parsed = parseProductFormData(formData);
    if (parsed.error || !parsed.data) {
      return { error: parsed.error || "Invalid form data." };
    }
    const d = parsed.data;

    const categoryExists = await prisma.category.findUnique({
      where: { id: d.categoryId },
      select: { id: true },
    });
    if (!categoryExists) {
      return { error: "Selected category no longer exists. Please choose a valid category." };
    }

    if (d.sku) {
      const duplicateSku = await prisma.product.findFirst({
        where: {
          sku: d.sku,
          NOT: { id },
        },
        select: { id: true, name: true },
      });
      if (duplicateSku) {
        return {
          error: `SKU "${d.sku}" is already assigned to "${duplicateSku.name}". Please use a different SKU or clear it.`,
        };
      }
    }

    // SINGLE ATOMIC TRANSACTION: If anything fails, existing images/variants/specs are NEVER lost!
    const updated = await prisma.$transaction(async (tx) => {
      const rels = await resolveMultiRelationsInTx(tx, d);

      await tx.productFeature.deleteMany({ where: { productId: id } });
      await tx.productSpecification.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.productImage.deleteMany({ where: { productId: id } });

      return tx.product.update({
        where: { id },
        data: {
          name: d.name,
          categoryId: d.categoryId,
          subCategoryId: rels.primarySubId,
          subCategories: {
            set: rels.subIds.map((subId) => ({ id: subId })),
          },
          isPodium: options?.forceIsPodium ?? existingProduct.isPodium,
          podiumSubCategoryId: rels.primaryPodiumSubId,
          podiumSubCategories: {
            set: rels.podiumSubIds.map((psubId) => ({ id: psubId })),
          },
          designRegistrationNo: d.designRegistrationNo,
          ipProtectionText: d.ipProtectionText,
          sku: d.sku,
          basePrice: d.basePrice,
          discountPrice: d.discountPrice,
          stockStatus: d.stockStatus,
          discountBadge: d.discountBadge,
          videoUrl: d.videoUrl,
          description: d.description,
          descriptionHtml: d.descriptionHtml,
          importantNoteHtml: d.importantNoteHtml,
          seoTitle: formData.has("seoTitle") ? d.seoTitle : undefined,
          metaDescription: formData.has("metaDescription") ? d.metaDescription : undefined,
          searchKeywords: formData.has("searchKeywords") ? d.searchKeywords : undefined,
          images: d.imageCreates.length > 0 ? { create: d.imageCreates } : undefined,
          features: d.featureCreates.length > 0 ? { create: d.featureCreates } : undefined,
          specifications: d.specCreates.length > 0 ? { create: d.specCreates } : undefined,
          variants: d.variantCreates.length > 0 ? { create: d.variantCreates } : undefined,
          problemStatements: {
            set: rels.problemIds.map((psId) => ({ id: psId })),
          },
          industries: {
            set: rels.industryIds.map((indId) => ({ id: indId })),
          },
        },
        select: { id: true, slug: true },
      });
    });

    await invalidateCacheTags(
      ["catalog", "taxonomy", "ai-snapshot", "ai-responses"],
      { paths: [`/shop/p/${updated.slug}`] }
    );
    revalidateCatalogPaths(updated.slug);
    try {
      revalidatePath(`/admin/products/${id}`);
      revalidatePath(`/admin/podiums/${id}`);
    } catch {
      // Safe fallback outside Next.js request context
    }

    return { success: true, slug: updated.slug };
  } catch (err: any) {
    console.error("updateCatalogItem error:", err);
    if (err?.code === "P2002") {
      return {
        error: "Update failed due to a duplicate SKU or slug.",
      };
    }
    return { error: err?.message || "Failed to update product. Please try again." };
  }
}
