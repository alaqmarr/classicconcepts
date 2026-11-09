import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

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
  revalidatePath("/");
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
}

interface ParsedProductPayload {
  name: string;
  categoryId: string;
  sku: string | null;
  podiumSubCategoryId: string | null;
  newPodiumSubCategory: string | null;
  basePrice: number | null;
  discountPrice: number | null;
  stockStatus: string;
  discountBadge: string | null;
  videoUrl: string | null;
  description: string | null;
  descriptionHtml: string | null;
  importantNoteHtml: string | null;
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
  industryIds: string[];
}

function parseProductFormData(formData: FormData): {
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

  const podiumSubCategoryId =
    ((formData.get("podiumSubCategoryId") as string) || "").trim() || null;
  const newPodiumSubCategory =
    ((formData.get("newPodiumSubCategory") as string) || "").trim() || null;

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
  const videoUrl = ((formData.get("videoUrl") as string) || "").trim() || null;
  const description =
    ((formData.get("description") as string) || "").trim() || null;
  const descriptionHtml = sanitizeRichHtml(
    formData.get("descriptionHtml") as string | null
  );
  const importantNoteHtml = sanitizeRichHtml(
    formData.get("importantNoteHtml") as string | null
  );

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
      (formData.getAll("problemStatements[]") as string[])
        .map((id) => (id || "").trim())
        .filter(Boolean)
    )
  );
  const industryIds = Array.from(
    new Set(
      (formData.getAll("industries[]") as string[])
        .map((id) => (id || "").trim())
        .filter(Boolean)
    )
  );

  return {
    data: {
      name,
      categoryId,
      sku,
      podiumSubCategoryId,
      newPodiumSubCategory,
      basePrice,
      discountPrice,
      stockStatus,
      discountBadge,
      videoUrl,
      description,
      descriptionHtml,
      importantNoteHtml,
      imageCreates,
      featureCreates,
      specCreates,
      variantCreates,
      problemStatementIds,
      industryIds,
    },
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
      let resolvedSubCatId = d.podiumSubCategoryId;
      if (d.newPodiumSubCategory) {
        const subSlug = normalizeSlug(d.newPodiumSubCategory, "podium-sub");
        const sub = await tx.podiumSubCategory.upsert({
          where: { slug: subSlug },
          update: { name: d.newPodiumSubCategory },
          create: { name: d.newPodiumSubCategory, slug: subSlug },
        });
        resolvedSubCatId = sub.id;
      }

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
          isPodium: finalIsPodium,
          podiumSubCategoryId: resolvedSubCatId,
          basePrice: d.basePrice,
          discountPrice: d.discountPrice,
          stockStatus: d.stockStatus,
          discountBadge: d.discountBadge,
          videoUrl: d.videoUrl,
          description: d.description,
          descriptionHtml: d.descriptionHtml,
          importantNoteHtml: d.importantNoteHtml,
          images: d.imageCreates.length > 0 ? { create: d.imageCreates } : undefined,
          features: d.featureCreates.length > 0 ? { create: d.featureCreates } : undefined,
          specifications: d.specCreates.length > 0 ? { create: d.specCreates } : undefined,
          variants: d.variantCreates.length > 0 ? { create: d.variantCreates } : undefined,
          problemStatements:
            d.problemStatementIds.length > 0
              ? { connect: d.problemStatementIds.map((id) => ({ id })) }
              : undefined,
          industries:
            d.industryIds.length > 0
              ? { connect: d.industryIds.map((id) => ({ id })) }
              : undefined,
        },
        select: { id: true, slug: true },
      });
    });

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
      let resolvedSubCatId = d.podiumSubCategoryId;
      if (d.newPodiumSubCategory) {
        const subSlug = normalizeSlug(d.newPodiumSubCategory, "podium-sub");
        const sub = await tx.podiumSubCategory.upsert({
          where: { slug: subSlug },
          update: { name: d.newPodiumSubCategory },
          create: { name: d.newPodiumSubCategory, slug: subSlug },
        });
        resolvedSubCatId = sub.id;
      }

      await tx.productFeature.deleteMany({ where: { productId: id } });
      await tx.productSpecification.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.productImage.deleteMany({ where: { productId: id } });

      return tx.product.update({
        where: { id },
        data: {
          name: d.name,
          categoryId: d.categoryId,
          isPodium: options?.forceIsPodium ?? existingProduct.isPodium,
          podiumSubCategoryId: resolvedSubCatId,
          sku: d.sku,
          basePrice: d.basePrice,
          discountPrice: d.discountPrice,
          stockStatus: d.stockStatus,
          discountBadge: d.discountBadge,
          videoUrl: d.videoUrl,
          description: d.description,
          descriptionHtml: d.descriptionHtml,
          importantNoteHtml: d.importantNoteHtml,
          images: d.imageCreates.length > 0 ? { create: d.imageCreates } : undefined,
          features: d.featureCreates.length > 0 ? { create: d.featureCreates } : undefined,
          specifications: d.specCreates.length > 0 ? { create: d.specCreates } : undefined,
          variants: d.variantCreates.length > 0 ? { create: d.variantCreates } : undefined,
          problemStatements: {
            set: d.problemStatementIds.map((psId) => ({ id: psId })),
          },
          industries: {
            set: d.industryIds.map((indId) => ({ id: indId })),
          },
        },
        select: { id: true, slug: true },
      });
    });

    revalidateCatalogPaths(updated.slug);
    revalidatePath(`/admin/products/${id}`);
    revalidatePath(`/admin/podiums/${id}`);

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
