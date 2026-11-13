import { prisma } from "@/lib/db";
import {
  generateUniqueCategorySlug,
  normalizeSlug,
  revalidateCatalogPaths,
  sanitizeRichHtml,
} from "@/lib/product-mutations";
import { runAdminInlineRewrite } from "@/lib/ai";
import { invalidateCacheTags } from "@/lib/redis-cache";
import { revalidatePath } from "next/cache";

export interface MainFamilyBlueprint {
  name: string;
  slug: string;
  description: string;
  keywords: string[];
}

export const MAIN_CATEGORY_FAMILIES: MainFamilyBlueprint[] = [
  {
    name: "Acrylic Podiums & Lecterns",
    slug: "podiums",
    description:
      "Clear, frosted, wooden-combination, and LED stage podiums built in our Secunderabad factory Since 2008. Protected original designs with custom logo options and safe all-India delivery.",
    keywords: ["podium", "lectern", "pulpit", "rostrum", "speech stand"],
  },
  {
    name: "Retail & Countertop Displays",
    slug: "retail-counter-displays",
    description:
      "Clear acrylic display stands, step risers, shoe boxes, domes, bottle stands, candy bins, and countertop organizers that make products easy to see in shops and showrooms.",
    keywords: [
      "display",
      "riser",
      "shoe",
      "candy",
      "bin",
      "dome",
      "bottle",
      "hanger",
      "jewel",
      "cosmetic",
      "watch",
      "mobile stand",
      "easel",
      "pedestal",
      "cake",
      "bakery",
      "tray",
    ],
  },
  {
    name: "Sign Holders & Poster Frames",
    slug: "sign-holders-frames",
    description:
      "Tabletop A4/A5 T-stands, L-stands, tent cards, QR code stands, wall frames, and clear acrylic sign boards for hotels, offices, restaurants, hospitals, and stores.",
    keywords: [
      "t stand",
      "t-stand",
      "l stand",
      "l-stand",
      "tent",
      "sign",
      "frame",
      "poster",
      "menu",
      "qr",
      "name plate",
      "nameplate",
      "photo frame",
      "wall mount",
      "a4",
      "a5",
      "a3",
    ],
  },
  {
    name: "Brochure & Literature Holders",
    slug: "brochure-literature-holders",
    description:
      "Countertop and wall-mounted brochure pockets, leaflet stands, magazine racks, and catalog holders made from thick, glass-clear cast acrylic.",
    keywords: [
      "brochure",
      "leaflet",
      "magazine",
      "catalog",
      "pamphlet",
      "literature",
      "book stand",
      "pocket",
      "flyer",
    ],
  },
  {
    name: "Trophies, Awards & Mementos",
    slug: "trophies-awards-mementos",
    description:
      "Custom laser-cut and color-printed clear acrylic trophies, corporate awards, plaques, shields, medals, and mementos for events, schools, and institutions.",
    keywords: [
      "trophy",
      "trophies",
      "award",
      "memento",
      "momento",
      "plaque",
      "shield",
      "medal",
      "souvenir",
    ],
  },
  {
    name: "Boxes, Lockable Bins & Enclosures",
    slug: "boxes-bins-enclosures",
    description:
      "Clear donation boxes, suggestion boxes with lock and key, ballot boxes, protective covers, lids, and custom industrial machine enclosures.",
    keywords: [
      "box",
      "donation",
      "suggestion",
      "ballot",
      "lid",
      "enclos",
      "cover",
      "case",
      "cube",
      "jar",
      "container",
      "guard",
      "drop box",
    ],
  },
  {
    name: "Office, Desk & Everyday Accessories",
    slug: "office-desk-accessories",
    description:
      "Clear pen stands, business card holders, paperweights, tissue boxes, file sorters, keychains, and neat desk organizers for modern workspaces and hotels.",
    keywords: [
      "pen",
      "paper weight",
      "paperweight",
      "visiting card",
      "business card",
      "tissue",
      "desk",
      "organizer",
      "file",
      "key chain",
      "keychain",
      "coaster",
      "calendar",
      "clipboard",
    ],
  },
  {
    name: "Acrylic Furniture & Tables",
    slug: "acrylic-furniture-tables",
    description:
      "Thick, heavy-duty clear acrylic coffee tables, side tables, console tables, stools, and studio desks crafted with smooth diamond-polished edges.",
    keywords: [
      "furniture",
      "table",
      "chair",
      "stool",
      "console",
      "trolley",
      "bench",
      "dining",
    ],
  },
  {
    name: "Religious & Institutional Items",
    slug: "religious-institutional",
    description:
      "Clear acrylic crosses, church pulpit accessories, communion trays, offering boxes, and institutional hall items made with clean polished edges.",
    keywords: ["cross", "church", "communion", "offering", "altar", "prayer", "religious"],
  },
  {
    name: "Medical, Lab & Hygiene Dispensers",
    slug: "medical-lab-dispensers",
    description:
      "Wall and counter dispensers for gloves, masks, sanitizers, syringes, and clean laboratory acrylic racks and trays for hospitals, clinics, and pharma plants.",
    keywords: [
      "medical",
      "hospital",
      "glove",
      "mask",
      "sanitizer",
      "lab",
      "pipette",
      "test tube",
      "dispenser",
      "pharma",
    ],
  },
];

const SPELLING_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bEnclosers\b/gi, "Enclosures"],
  [/\bEncloser\b/gi, "Enclosure"],
  [/\bMomentos\b/gi, "Mementos"],
  [/\bMomento\b/gi, "Memento"],
  [/\bAcylic\b/gi, "Acrylic"],
  [/\bAcryilc\b/gi, "Acrylic"],
  [/\bKey Chains\b/gi, "Keychains"],
  [/\bKey Chain\b/gi, "Keychain"],
  [/\bPaper Weights\b/gi, "Paperweights"],
  [/\bPaper Weight\b/gi, "Paperweight"],
  [/\bSignages\b/gi, "Signage"],
];

export function fixTaxonomyLabelSpelling(raw: string): string {
  let next = raw.trim().replace(/\s{2,}/g, " ");
  for (const [pattern, replacement] of SPELLING_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

export function buildPlainCategorySummary(
  name: string,
  parentName?: string | null
): string {
  const clean = fixTaxonomyLabelSpelling(name);
  const lower = clean.toLowerCase();
  if (parentName) {
    return `Browse our factory-made ${lower} under ${parentName}. Built in Secunderabad Since 2008 from thick, glass-clear cast acrylic with smooth edges, custom sizes, and optional logo printing.`;
  }
  return `Browse our factory-made ${lower}, crafted Since 2008 in our 16,000 sq. ft. Secunderabad facility from thick, glass-clear cast acrylic. Custom sizes, bulk quantities, and front logo printing available.`;
}

function inferMainFamilyForCategoryName(catName: string): MainFamilyBlueprint | null {
  const lower = fixTaxonomyLabelSpelling(catName).toLowerCase();
  // Skip if it already matches one of our main family names or slugs closely
  for (const fam of MAIN_CATEGORY_FAMILIES) {
    if (
      lower === fam.name.toLowerCase() ||
      normalizeSlug(lower) === fam.slug
    ) {
      return null;
    }
  }
  for (const fam of MAIN_CATEGORY_FAMILIES) {
    if (fam.keywords.some((kw) => lower.includes(kw))) {
      return fam;
    }
  }
  return null;
}

/**
 * Generates a unique SubCategory slug inside a Prisma transaction (`tx`).
 */
async function ensureUniqueSubSlugInTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  preferredSlugOrName: string,
  excludeSubId?: string
): Promise<string> {
  const base = normalizeSlug(preferredSlugOrName, "sub");
  let candidate = base;
  let counter = 2;
  while (true) {
    const existing = await tx.subCategory.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || (excludeSubId && existing.id === excludeSubId)) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
}

function safeRevalidatePath(p: string) {
  try {
    revalidatePath(p);
  } catch {
    // Safe fallback outside Next.js request context
  }
}

/**
 * Atomically converts selected standalone `Category` records into `SubCategory` records
 * under a chosen (or newly created) Main Parent Category, updating ALL associated `Product`
 * records (`categoryId` + `subCategoryId`) safely in a single database transaction.
 */
export async function convertCategoriesToSubcategories(options: {
  sourceCategoryIds: string[];
  targetParentId?: string;
  newParentName?: string;
  newParentDescription?: string;
  customOverrides?: Record<
    string,
    { subcategoryName?: string; subcategoryDescription?: string }
  >;
}) {
  const cleanSourceIds = Array.from(
    new Set((options.sourceCategoryIds || []).map((x) => x.trim()).filter(Boolean))
  );

  if (cleanSourceIds.length === 0) {
    throw new Error("Please select at least one category to convert.");
  }

  let resolvedParentId = options.targetParentId?.trim() || "";
  if (!resolvedParentId && options.newParentName?.trim()) {
    const pName = fixTaxonomyLabelSpelling(options.newParentName.trim());
    const pSlug = await generateUniqueCategorySlug(pName);
    const pDesc =
      options.newParentDescription?.trim() || buildPlainCategorySummary(pName);
    const createdParent = await prisma.category.create({
      data: {
        name: pName,
        slug: pSlug,
        description: pDesc,
        descriptionHtml: `<p>${pDesc}</p>`,
      },
    });
    resolvedParentId = createdParent.id;
  }

  if (!resolvedParentId) {
    throw new Error(
      "Please choose an existing Main Parent Category or enter a New Main Category name."
    );
  }

  const parentCat = await prisma.category.findUnique({
    where: { id: resolvedParentId },
  });
  if (!parentCat) {
    throw new Error("Target Main Parent Category was not found.");
  }

  const filteredSourceIds = cleanSourceIds.filter((id) => id !== parentCat.id);
  if (filteredSourceIds.length === 0) {
    throw new Error(
      "Selected category is already the chosen Main Parent Category. Select one or more other categories to convert into subcategories under it."
    );
  }

  const parentIsPodium =
    parentCat.slug === "podium" ||
    parentCat.slug === "podiums" ||
    parentCat.name.toLowerCase().includes("podium");

  const result = await prisma.$transaction(async (tx) => {
    const sourceCats = await tx.category.findMany({
      where: { id: { in: filteredSourceIds } },
      include: { subCategories: true },
    });

    let subcategoriesCreated = 0;
    let productsUpdated = 0;

    for (const srcCat of sourceCats) {
      const override = options.customOverrides?.[srcCat.id];
      const cleanSubName = fixTaxonomyLabelSpelling(
        override?.subcategoryName?.trim() || srcCat.name
      );
      // Preserve the exact old category slug whenever free so `/shop/c/<old-slug>` 308/307 redirects seamlessly!
      const subSlug = await ensureUniqueSubSlugInTx(
        tx,
        srcCat.slug || cleanSubName
      );
      const subDesc =
        override?.subcategoryDescription?.trim() ||
        srcCat.description?.trim() ||
        buildPlainCategorySummary(cleanSubName, parentCat.name);
      const subDescHtml =
        override?.subcategoryDescription?.trim()
          ? `<p>${override.subcategoryDescription.trim()}</p>`
          : srcCat.descriptionHtml?.trim() || `<p>${subDesc}</p>`;

      const createdSub = await tx.subCategory.create({
        data: {
          name: cleanSubName,
          slug: subSlug,
          description: subDesc,
          descriptionHtml: subDescHtml,
          imageUrl: srcCat.imageUrl || null,
          categoryId: parentCat.id,
        },
      });
      subcategoriesCreated++;

      // Move any nested subcategories that already lived under `srcCat` to `parentCat`
      if (srcCat.subCategories.length > 0) {
        await tx.subCategory.updateMany({
          where: { categoryId: srcCat.id },
          data: { categoryId: parentCat.id },
        });
      }

      // Find direct products so we also connect multi-select `subCategories` relation cleanly
      const directProducts = await tx.product.findMany({
        where: { categoryId: srcCat.id, subCategoryId: null },
        select: { id: true },
      });

      // 1) Products under `srcCat` WITHOUT an existing `subCategoryId` get assigned to `createdSub.id` + `parentCat.id`
      const movedDirect = await tx.product.updateMany({
        where: {
          categoryId: srcCat.id,
          subCategoryId: null,
        },
        data: {
          categoryId: parentCat.id,
          subCategoryId: createdSub.id,
          ...(parentIsPodium ? { isPodium: true } : {}),
        },
      });

      for (const dp of directProducts) {
        await tx.product.update({
          where: { id: dp.id },
          data: {
            subCategories: { connect: { id: createdSub.id } },
          },
        });
      }

      // 2) Products under `srcCat` that ALREADY had a `subCategoryId` keep their `subCategoryId` and move `categoryId` -> `parentCat.id`
      const movedNested = await tx.product.updateMany({
        where: {
          categoryId: srcCat.id,
          NOT: { subCategoryId: null },
        },
        data: {
          categoryId: parentCat.id,
          ...(parentIsPodium ? { isPodium: true } : {}),
        },
      });

      productsUpdated += movedDirect.count + movedNested.count;

      // If parent lacks a thumbnail image, inherit the first available category image
      if (!parentCat.imageUrl && srcCat.imageUrl) {
        await tx.category.update({
          where: { id: parentCat.id },
          data: { imageUrl: srcCat.imageUrl },
        });
        parentCat.imageUrl = srcCat.imageUrl;
      }

      // Now 0 products reference `srcCat.id`, so deleting the old standalone Category is 100% safe!
      await tx.category.delete({ where: { id: srcCat.id } });
    }

    return {
      parentId: parentCat.id,
      parentName: parentCat.name,
      parentSlug: parentCat.slug,
      categoriesConverted: sourceCats.length,
      subcategoriesCreated,
      productsUpdated,
    };
  });

  await invalidateCacheTags(["taxonomy", "catalog", "ai-snapshot", "ai-responses"]);
  safeRevalidatePath("/admin/categories");
  revalidateCatalogPaths();
  return result;
}

/**
 * Merges duplicate categories directly into a single target Category (moving all products & subcategories).
 */
export async function mergeCategoriesIntoTarget(options: {
  sourceCategoryIds: string[];
  targetCategoryId: string;
}) {
  const targetCat = await prisma.category.findUnique({
    where: { id: options.targetCategoryId },
  });
  if (!targetCat) {
    throw new Error("Target category not found.");
  }

  const sourceIds = Array.from(
    new Set(
      (options.sourceCategoryIds || [])
        .map((s) => s.trim())
        .filter((id) => id && id !== targetCat.id)
    )
  );
  if (sourceIds.length === 0) {
    throw new Error("Select at least one duplicate category different from the target category.");
  }

  const targetIsPodium =
    targetCat.slug === "podium" ||
    targetCat.slug === "podiums" ||
    targetCat.name.toLowerCase().includes("podium");

  const stats = await prisma.$transaction(async (tx) => {
    const movedSubs = await tx.subCategory.updateMany({
      where: { categoryId: { in: sourceIds } },
      data: { categoryId: targetCat.id },
    });

    const movedProducts = await tx.product.updateMany({
      where: { categoryId: { in: sourceIds } },
      data: {
        categoryId: targetCat.id,
        ...(targetIsPodium ? { isPodium: true } : {}),
      },
    });

    const deleted = await tx.category.deleteMany({
      where: { id: { in: sourceIds } },
    });

    return {
      targetName: targetCat.name,
      mergedCategories: deleted.count,
      movedSubcategories: movedSubs.count,
      movedProducts: movedProducts.count,
    };
  });

  await invalidateCacheTags(["taxonomy", "catalog", "ai-snapshot", "ai-responses"]);
  safeRevalidatePath("/admin/categories");
  revalidateCatalogPaths();
  return stats;
}

/**
 * Previews (`dryRun: true`) or executes (`dryRun: false`) smart grouping of granular flat categories
 * into clean Main Parent Categories with Subcategories, safely migrating all production products.
 */
export async function autoGroupGranularCategories(options: { dryRun: boolean }) {
  const allCategories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: true, subCategories: true } },
    },
  });

  const planGroups = new Map<
    string,
    {
      family: MainFamilyBlueprint;
      existingParentId: string | null;
      sourceCategories: Array<{
        id: string;
        name: string;
        slug: string;
        productCount: number;
      }>;
    }
  >();

  for (const fam of MAIN_CATEGORY_FAMILIES) {
    const existingParent = allCategories.find(
      (c) =>
        c.slug === fam.slug ||
        c.name.toLowerCase() === fam.name.toLowerCase() ||
        (fam.slug === "podiums" &&
          (c.slug === "podium" || c.name.toLowerCase() === "acrylic podiums"))
    );
    planGroups.set(fam.slug, {
      family: fam,
      existingParentId: existingParent?.id || null,
      sourceCategories: [],
    });
  }

  for (const cat of allCategories) {
    // Do not convert a category that is ALREADY acting as a parent with subcategories
    if (cat._count.subCategories > 0) continue;
    // Skip if this category IS already one of the matched parents
    const isAlreadyParent = Array.from(planGroups.values()).some(
      (g) => g.existingParentId === cat.id
    );
    if (isAlreadyParent) continue;

    const matchedFamily = inferMainFamilyForCategoryName(cat.name);
    if (matchedFamily) {
      const bucket = planGroups.get(matchedFamily.slug);
      if (bucket) {
        bucket.sourceCategories.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          productCount: cat._count.products,
        });
      }
    }
  }

  const activeGroups = Array.from(planGroups.values()).filter(
    (g) => g.sourceCategories.length > 0
  );

  // Build interactive editable rows + parent candidates for Admin Review Workbench
  const parentCandidates: Array<{
    key: string;
    name: string;
    slug: string;
    description: string;
    existingCategoryId: string | null;
  }> = MAIN_CATEGORY_FAMILIES.map((fam) => {
    const grp = planGroups.get(fam.slug);
    return {
      key: `fam:${fam.slug}`,
      name: fam.name,
      slug: fam.slug,
      description: fam.description,
      existingCategoryId: grp?.existingParentId || null,
    };
  });

  for (const cat of allCategories) {
    if (cat._count.subCategories > 0) {
      const alreadyListed = parentCandidates.some(
        (p) => p.existingCategoryId === cat.id
      );
      if (!alreadyListed) {
        parentCandidates.push({
          key: `cat:${cat.id}`,
          name: cat.name,
          slug: cat.slug,
          description:
            cat.description || buildPlainCategorySummary(cat.name),
          existingCategoryId: cat.id,
        });
      }
    }
  }

  const interactiveRows: Array<{
    categoryId: string;
    currentName: string;
    slug: string;
    productCount: number;
    autoMatched: boolean;
    approved: boolean;
    targetParentKey: string;
    proposedSubcategoryName: string;
    proposedDescription: string;
  }> = [];

  for (const cat of allCategories) {
    if (cat._count.subCategories > 0) continue;
    const isAlreadyParent = Array.from(planGroups.values()).some(
      (g) => g.existingParentId === cat.id
    );
    if (isAlreadyParent) continue;

    const matchedFamily = inferMainFamilyForCategoryName(cat.name);
    const cleanSubName = fixTaxonomyLabelSpelling(cat.name);
    interactiveRows.push({
      categoryId: cat.id,
      currentName: cat.name,
      slug: cat.slug,
      productCount: cat._count.products,
      autoMatched: Boolean(matchedFamily),
      approved: Boolean(matchedFamily),
      targetParentKey: matchedFamily ? `fam:${matchedFamily.slug}` : "",
      proposedSubcategoryName: cleanSubName,
      proposedDescription:
        cat.description?.trim() ||
        buildPlainCategorySummary(
          cleanSubName,
          matchedFamily?.name || undefined
        ),
    });
  }

  if (options.dryRun) {
    return {
      dryRun: true,
      totalGroups: activeGroups.length,
      totalCategoriesToConvert: activeGroups.reduce(
        (acc, g) => acc + g.sourceCategories.length,
        0
      ),
      totalProductsAffected: activeGroups.reduce(
        (acc, g) =>
          acc + g.sourceCategories.reduce((s, c) => s + c.productCount, 0),
        0
      ),
      groups: activeGroups.map((g) => ({
        parentName: g.family.name,
        parentExists: Boolean(g.existingParentId),
        categories: g.sourceCategories,
      })),
      parentCandidates,
      rows: interactiveRows,
    };
  }

  let totalConverted = 0;
  let totalProductsMoved = 0;
  const executedGroups: Array<{
    parentName: string;
    converted: number;
    productsUpdated: number;
  }> = [];

  for (const group of activeGroups) {
    let targetParentId = group.existingParentId;
    if (!targetParentId) {
      const uniqueSlug = await generateUniqueCategorySlug(
        group.family.slug || group.family.name
      );
      const createdParent = await prisma.category.create({
        data: {
          name: group.family.name,
          slug: uniqueSlug,
          description: group.family.description,
          descriptionHtml: `<p>${group.family.description}</p>`,
        },
      });
      targetParentId = createdParent.id;
    }

    const res = await convertCategoriesToSubcategories({
      sourceCategoryIds: group.sourceCategories.map((c) => c.id),
      targetParentId,
    });
    totalConverted += res.categoriesConverted;
    totalProductsMoved += res.productsUpdated;
    executedGroups.push({
      parentName: res.parentName,
      converted: res.categoriesConverted,
      productsUpdated: res.productsUpdated,
    });
  }

  await invalidateCacheTags(["taxonomy", "catalog", "ai-snapshot", "ai-responses"]);
  safeRevalidatePath("/admin/categories");
  revalidateCatalogPaths();

  return {
    dryRun: false,
    totalGroups: executedGroups.length,
    totalCategoriesToConvert: totalConverted,
    totalProductsAffected: totalProductsMoved,
    executedGroups,
  };
}

function toSmartTitleCaseRole(raw: string): string {
  const acronyms = new Set([
    "MD",
    "CEO",
    "CFO",
    "COO",
    "CTO",
    "GM",
    "HR",
    "IT",
    "QC",
    "QA",
    "CNC",
    "R&D",
    "VP",
    "AVP",
    "BDM",
  ]);
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => {
      const upper = word.toUpperCase();
      if (acronyms.has(upper)) return upper;
      if (word.length <= 2 && /^(of|in|at|&|to)$/i.test(word)) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Executes an Admin-reviewed & customized Category -> Subcategory mapping plan.
 * Nothing runs unless explicitly submitted & confirmed by the Admin!
 */
export async function executeCustomCategoryMappingPlan(plan: {
  parents: Array<{
    key: string;
    name: string;
    slug?: string;
    description?: string;
    existingCategoryId?: string | null;
  }>;
  items: Array<{
    sourceCategoryId: string;
    targetParentKey: string;
    subcategoryName: string;
    subcategoryDescription?: string;
  }>;
}) {
  const validItems = (plan.items || []).filter(
    (it) =>
      it.sourceCategoryId?.trim() &&
      it.targetParentKey?.trim() &&
      it.subcategoryName?.trim()
  );

  if (validItems.length === 0) {
    throw new Error("Please approve and assign at least one category in the mapping table.");
  }

  const parentMap = new Map(
    (plan.parents || []).map((p) => [p.key, p])
  );

  // Group approved items by targetParentKey
  const itemsByParentKey = new Map<string, typeof validItems>();
  for (const item of validItems) {
    const arr = itemsByParentKey.get(item.targetParentKey) || [];
    arr.push(item);
    itemsByParentKey.set(item.targetParentKey, arr);
  }

  let totalConverted = 0;
  let totalProductsMoved = 0;
  let totalGroupsExecuted = 0;

  for (const [parentKey, groupItems] of itemsByParentKey.entries()) {
    const parentSpec = parentMap.get(parentKey);
    let targetParentId = parentSpec?.existingCategoryId || "";

    if (!targetParentId && parentKey.startsWith("cat:")) {
      targetParentId = parentKey.slice(4);
    }

    if (!targetParentId) {
      const pName = fixTaxonomyLabelSpelling(
        parentSpec?.name?.trim() || "General Acrylic Products"
      );
      const pSlug = await generateUniqueCategorySlug(
        parentSpec?.slug || pName
      );
      const pDesc =
        parentSpec?.description?.trim() || buildPlainCategorySummary(pName);
      const createdParent = await prisma.category.create({
        data: {
          name: pName,
          slug: pSlug,
          description: pDesc,
          descriptionHtml: `<p>${pDesc}</p>`,
        },
      });
      targetParentId = createdParent.id;
    } else if (parentSpec?.name?.trim()) {
      // Allow admin edits to parent name / description if provided
      await prisma.category.update({
        where: { id: targetParentId },
        data: {
          name: fixTaxonomyLabelSpelling(parentSpec.name.trim()),
          ...(parentSpec.description?.trim()
            ? { description: parentSpec.description.trim() }
            : {}),
        },
      }).catch(() => {});
    }

    const customOverrides: Record<
      string,
      { subcategoryName?: string; subcategoryDescription?: string }
    > = {};
    for (const gi of groupItems) {
      customOverrides[gi.sourceCategoryId] = {
        subcategoryName: gi.subcategoryName,
        subcategoryDescription: gi.subcategoryDescription,
      };
    }

    const sourceIds = groupItems
      .map((gi) => gi.sourceCategoryId)
      .filter((id) => id !== targetParentId);
    if (sourceIds.length === 0) continue;

    const res = await convertCategoriesToSubcategories({
      sourceCategoryIds: sourceIds,
      targetParentId,
      customOverrides,
    });
    totalConverted += res.categoriesConverted;
    totalProductsMoved += res.productsUpdated;
    totalGroupsExecuted++;
  }

  await invalidateCacheTags(["taxonomy", "catalog", "ai-snapshot", "ai-responses"]);
  safeRevalidatePath("/admin/categories");
  revalidateCatalogPaths();

  return {
    totalGroups: totalGroupsExecuted,
    totalCategoriesToConvert: totalConverted,
    totalProductsAffected: totalProductsMoved,
  };
}

/**
 * Smart Catalog & Site Alignment Action with mandatory `dryRun` preview & per-item Admin approval!
 */
export async function runSmartCatalogAlignment(options?: {
  dryRun?: boolean;
  approvedTaxonomyUpdates?: Array<{
    id: string;
    kind: "category" | "subCategory";
    name: string;
    description: string;
  }>;
  syncProductParents?: boolean;
  syncPodiumFlags?: boolean;
  approvedTeamUpdates?: Array<{
    id: string;
    position: string;
  }>;
}) {
  const isDryRun = options?.dryRun !== false;

  const categories = await prisma.category.findMany({
    include: { subCategories: true },
    orderBy: { name: "asc" },
  });

  const proposedTaxonomyUpdates: Array<{
    id: string;
    kind: "category" | "subCategory";
    parentName?: string;
    currentName: string;
    proposedName: string;
    hasRename: boolean;
    needsDescription: boolean;
    proposedDescription: string;
  }> = [];

  let outOfSyncProductParentCount = 0;

  for (const cat of categories) {
    const fixedName = fixTaxonomyLabelSpelling(cat.name);
    const needsDesc = !cat.description?.trim() && !cat.descriptionHtml?.trim();
    const fallbackDesc = needsDesc
      ? buildPlainCategorySummary(fixedName)
      : cat.description?.trim() ||
        (cat.descriptionHtml || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 260);

    if (fixedName !== cat.name || needsDesc || (!cat.description?.trim() && cat.descriptionHtml)) {
      proposedTaxonomyUpdates.push({
        id: cat.id,
        kind: "category",
        currentName: cat.name,
        proposedName: fixedName,
        hasRename: fixedName !== cat.name,
        needsDescription: needsDesc || !cat.description?.trim(),
        proposedDescription: fallbackDesc,
      });
    }

    for (const sub of cat.subCategories) {
      const fixedSubName = fixTaxonomyLabelSpelling(sub.name);
      const subNeedsDesc =
        !sub.description?.trim() && !sub.descriptionHtml?.trim();
      const proposedSubDesc = subNeedsDesc
        ? buildPlainCategorySummary(fixedSubName, fixedName)
        : sub.description?.trim() || "";

      if (fixedSubName !== sub.name || subNeedsDesc) {
        proposedTaxonomyUpdates.push({
          id: sub.id,
          kind: "subCategory",
          parentName: fixedName,
          currentName: sub.name,
          proposedName: fixedSubName,
          hasRename: fixedSubName !== sub.name,
          needsDescription: subNeedsDesc,
          proposedDescription: proposedSubDesc,
        });
      }

      const mismatchCount = await prisma.product.count({
        where: {
          subCategoryId: sub.id,
          NOT: { categoryId: cat.id },
        },
      });
      outOfSyncProductParentCount += mismatchCount;
    }
  }

  const outOfSyncPodiumCount = await prisma.product.count({
    where: {
      isPodium: false,
      OR: [
        { podiumSubCategoryId: { not: null } },
        { category: { slug: { in: ["podium", "podiums", "acrylic-podiums"] } } },
        { category: { name: { contains: "Podium" } } },
      ],
    },
  });

  const team = await prisma.teamMember.findMany();
  const proposedTeamUpdates: Array<{
    id: string;
    memberName: string;
    currentPosition: string;
    proposedPosition: string;
  }> = [];

  for (const member of team) {
    if (
      member.position &&
      member.position.length > 4 &&
      member.position === member.position.toUpperCase()
    ) {
      const nextPos = toSmartTitleCaseRole(member.position);
      if (nextPos !== member.position) {
        proposedTeamUpdates.push({
          id: member.id,
          memberName: member.name,
          currentPosition: member.position,
          proposedPosition: nextPos,
        });
      }
    }
  }

  if (isDryRun) {
    return {
      dryRun: true,
      proposedTaxonomyUpdates,
      outOfSyncProductParentCount,
      outOfSyncPodiumCount,
      proposedTeamUpdates,
      categoriesRenamed: proposedTaxonomyUpdates.filter((x) => x.hasRename).length,
      descriptionsFilled: proposedTaxonomyUpdates.filter((x) => x.needsDescription)
        .length,
      productParentSynced: outOfSyncProductParentCount,
      podiumFlagsSynced: outOfSyncPodiumCount,
      teamRolesFormatted: proposedTeamUpdates.length,
    };
  }

  // Execute ONLY Admin-confirmed items
  let categoriesRenamed = 0;
  let descriptionsFilled = 0;
  let productParentSynced = 0;
  let podiumFlagsSynced = 0;
  let teamRolesFormatted = 0;

  const updatesToApply =
    options?.approvedTaxonomyUpdates !== undefined
      ? options.approvedTaxonomyUpdates
      : proposedTaxonomyUpdates.map((u) => ({
          id: u.id,
          kind: u.kind,
          name: u.proposedName,
          description: u.proposedDescription,
        }));

  for (const item of updatesToApply) {
    const cleanName = fixTaxonomyLabelSpelling(item.name);
    const cleanDesc = item.description?.trim() || "";
    if (item.kind === "category") {
      const existing = categories.find((c) => c.id === item.id);
      if (!existing) continue;
      await prisma.category.update({
        where: { id: item.id },
        data: {
          name: cleanName,
          ...(cleanDesc
            ? {
                description: cleanDesc,
                ...(!existing.descriptionHtml?.trim()
                  ? { descriptionHtml: `<p>${cleanDesc}</p>` }
                  : {}),
              }
            : {}),
        },
      });
      if (cleanName !== existing.name) categoriesRenamed++;
      if (cleanDesc && !existing.description?.trim()) descriptionsFilled++;
    } else {
      await prisma.subCategory.update({
        where: { id: item.id },
        data: {
          name: cleanName,
          ...(cleanDesc
            ? {
                description: cleanDesc,
                descriptionHtml: `<p>${cleanDesc}</p>`,
              }
            : {}),
        },
      }).catch(() => {});
      categoriesRenamed++;
      if (cleanDesc) descriptionsFilled++;
    }
  }

  if (options?.syncProductParents !== false) {
    for (const cat of categories) {
      for (const sub of cat.subCategories) {
        const synced = await prisma.product.updateMany({
          where: {
            subCategoryId: sub.id,
            NOT: { categoryId: cat.id },
          },
          data: { categoryId: cat.id },
        });
        productParentSynced += synced.count;
      }
    }
  }

  if (options?.syncPodiumFlags !== false) {
    const podiumSync = await prisma.product.updateMany({
      where: {
        isPodium: false,
        OR: [
          { podiumSubCategoryId: { not: null } },
          { category: { slug: { in: ["podium", "podiums", "acrylic-podiums"] } } },
          { category: { name: { contains: "Podium" } } },
        ],
      },
      data: { isPodium: true },
    });
    podiumFlagsSynced = podiumSync.count;
  }

  const teamToApply =
    options?.approvedTeamUpdates !== undefined
      ? options.approvedTeamUpdates
      : proposedTeamUpdates.map((t) => ({
          id: t.id,
          position: t.proposedPosition,
        }));

  for (const t of teamToApply) {
    if (!t.position?.trim()) continue;
    await prisma.teamMember
      .update({
        where: { id: t.id },
        data: { position: t.position.trim() },
      })
      .then(() => {
        teamRolesFormatted++;
      })
      .catch(() => {});
  }

  await invalidateCacheTags([
    "taxonomy",
    "catalog",
    "brand",
    "ai-snapshot",
    "ai-responses",
  ]);
  safeRevalidatePath("/admin/categories");
  safeRevalidatePath("/about/team");
  revalidateCatalogPaths();

  return {
    dryRun: false,
    categoriesRenamed,
    descriptionsFilled,
    productParentSynced,
    podiumFlagsSynced,
    teamRolesFormatted,
  };
}

/**
 * CRUD for SubCategory + ACRIO plain-language description writer
 */
export async function upsertSubCategoryItem(input: {
  id?: string;
  categoryId: string;
  name: string;
  slug?: string;
  description?: string | null;
  descriptionHtml?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}) {
  const cleanName = fixTaxonomyLabelSpelling(input.name);
  if (!cleanName) {
    throw new Error("Subcategory name is required.");
  }

  const parent = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, name: true },
  });
  if (!parent) {
    throw new Error("Parent category not found.");
  }

  const cleanDesc = input.description?.trim() || null;
  const cleanHtml =
    sanitizeRichHtml(input.descriptionHtml) ||
    (cleanDesc ? `<p>${cleanDesc}</p>` : null);

  if (input.id) {
    const existing = await prisma.subCategory.findUnique({
      where: { id: input.id },
    });
    if (!existing) throw new Error("Subcategory not found.");

    const nextSlug = await prisma.$transaction((tx) =>
      ensureUniqueSubSlugInTx(tx, input.slug || cleanName, input.id)
    );

    const updated = await prisma.subCategory.update({
      where: { id: input.id },
      data: {
        name: cleanName,
        slug: nextSlug,
        categoryId: parent.id,
        description: cleanDesc,
        descriptionHtml: cleanHtml,
        imageUrl: input.imageUrl?.trim() || null,
        sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : existing.sortOrder,
      },
    });

    // If subcategory moved to a new parent category, automatically move its products' `categoryId` too!
    if (existing.categoryId !== parent.id) {
      await prisma.product.updateMany({
        where: { subCategoryId: updated.id },
        data: { categoryId: parent.id },
      });
    }

    await invalidateCacheTags(["taxonomy", "catalog", "ai-snapshot", "ai-responses"]);
    safeRevalidatePath("/admin/categories");
    safeRevalidatePath(`/admin/categories/${parent.id}`);
    revalidateCatalogPaths();
    return updated;
  }

  const nextSlug = await prisma.$transaction((tx) =>
    ensureUniqueSubSlugInTx(tx, input.slug || cleanName)
  );

  const created = await prisma.subCategory.create({
    data: {
      name: cleanName,
      slug: nextSlug,
      categoryId: parent.id,
      description: cleanDesc || buildPlainCategorySummary(cleanName, parent.name),
      descriptionHtml:
        cleanHtml || `<p>${buildPlainCategorySummary(cleanName, parent.name)}</p>`,
      imageUrl: input.imageUrl?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  await invalidateCacheTags(["taxonomy", "catalog", "ai-snapshot", "ai-responses"]);
  safeRevalidatePath("/admin/categories");
  safeRevalidatePath(`/admin/categories/${parent.id}`);
  revalidateCatalogPaths();
  return created;
}

export async function generateAcrioTaxonomyDescription(options: {
  name: string;
  parentName?: string;
}) {
  const fallback = buildPlainCategorySummary(options.name, options.parentName);
  const res = await runAdminInlineRewrite({
    currentText: fallback,
    instruction: options.parentName
      ? `Write a friendly 2-sentence plain layman English description for the "${options.name}" subcategory under "${options.parentName}" at Classic Concepts (manufacturing Since 2008 in Secunderabad). Mention glass-clear thick acrylic, smooth edges, and custom size/logo options. Zero em dashes and zero buzzwords.`
      : `Write a friendly 2-sentence plain layman English description for the "${options.name}" main product category at Classic Concepts (manufacturing Since 2008 in Secunderabad). Mention glass-clear thick acrylic, smooth edges, and custom size/logo options. Zero em dashes and zero buzzwords.`,
    mode: "plain",
    fieldLabel: options.parentName
      ? `Subcategory Description (${options.name})`
      : `Category Description (${options.name})`,
  });

  return res.result?.trim() || fallback;
}
