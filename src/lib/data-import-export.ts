import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  invalidateAiCatalogCache,
  invalidateAiSettingsCache,
} from "@/lib/ai-context";
import { invalidateSiteContentCache } from "@/lib/site-content";
import { invalidateCacheTags } from "@/lib/redis-cache";
import { revalidateCatalogPaths } from "@/lib/product-mutations";

export type BundleType = "catalog-bundle" | "site-data" | "site-settings";
export type ImportMode = "merge" | "replace";

export const REDACTED_SECRET = "__REDACTED__";

const SECRET_SETTING_FIELDS = [
  "anthropicApiKey",
  "anthropicClientApiKey",
  "anthropicAdminApiKey",
  "smtpPass",
] as const;

const BACKUPS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "backups");

export interface ExportEnvelope<T = unknown> {
  schemaVersion: "1.0";
  sourceApp: "classicconcepts";
  bundleType: BundleType;
  exportedAt: string;
  secretsRedacted?: boolean;
  counts: Record<string, number>;
  data: T;
}

export interface CatalogBundleData {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    bgClass: string | null;
    description: string | null;
    descriptionHtml: string | null;
    sortOrder: number;
  }>;
  subCategories: Array<{
    id: string;
    name: string;
    slug: string;
    categorySlug: string;
    description: string | null;
    descriptionHtml: string | null;
    imageUrl: string | null;
    sortOrder: number;
  }>;
  podiumSubCategories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    descriptionHtml: string | null;
    imageUrl: string | null;
    sortOrder: number;
  }>;
  industries: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    description: string | null;
    solutionGroupsJson: string | null;
  }>;
  problemStatements: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    description: string | null;
  }>;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    basePrice: number | null;
    discountPrice: number | null;
    discountBadge: string | null;
    stockStatus: string;
    videoUrl: string | null;
    description: string | null;
    descriptionHtml: string | null;
    importantNoteHtml: string | null;
    categorySlug: string;
    subCategorySlug: string | null;
    subCategorySlugs?: string[];
    isPodium: boolean;
    podiumSubCategorySlug: string | null;
    podiumSubCategorySlugs?: string[];
    isRegisteredDesign: boolean;
    designRegistrationNo: string | null;
    ipProtectionText: string | null;
    industrySlugs: string[];
    problemStatementSlugs: string[];
    images: Array<{ url: string; isMain: boolean }>;
    features: string[];
    specifications: Array<{ name: string; value: string; type: string }>;
    variants: Array<{
      name: string;
      imageUrl: string | null;
      price: number | null;
      images: string[];
    }>;
  }>;
}

export interface SiteDataBundleData {
  siteContent: Array<{
    key: string;
    value: string;
    type: string;
  }>;
  teamMembers: Array<{
    id: string;
    name: string;
    position: string;
    photoUrl: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    bio: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
  clients: Array<{
    id: string;
    name: string;
    logoUrl: string | null;
    sector: string | null;
    isFeatured: boolean;
  }>;
  onlinePlatforms: Array<{
    id: string;
    name: string;
    storeUrl: string;
    storeRegion: string;
    iconName: string;
    colorClass: string | null;
  }>;
  certificates: Array<{
    id: string;
    title: string;
    imageUrl: string;
    issuedBy: string | null;
    docType: string;
    sortOrder: number;
  }>;
  resources: Array<{
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    type: string;
    fileSize: string | null;
    updatedLabel: string | null;
    thumbnailUrl: string | null;
    sortOrder: number;
  }>;
  galleryImages: Array<{
    id: string;
    url: string;
    altText: string | null;
    sortOrder: number;
  }>;
  machinery: Array<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string;
    sortOrder: number;
  }>;
  pressArticles: Array<{
    id: string;
    title: string;
    publication: string | null;
    date: string | null;
    category: string;
    summary: string | null;
    imageUrl: string | null;
    externalUrl: string | null;
    sortOrder: number;
  }>;
  infrastructureLocations: Array<{
    id: string;
    name: string;
    imageUrl: string;
    mapUrl: string | null;
    sortOrder: number;
  }>;
  usefulLinks: Array<{
    id: string;
    title: string;
    url: string;
    isActive: boolean;
    sortOrder: number;
  }>;
}

export interface SiteSettingsBundleData {
  settings: Record<string, unknown>;
}

export interface ServerBackupFileInfo {
  fileName: string;
  bundleType: BundleType | "pre-deploy-site-content" | "unknown";
  sizeBytes: number;
  createdAt: string;
}

function safeRevalidateAll() {
  try {
    revalidateCatalogPaths();
    revalidatePath("/", "layout");
  } catch {
    // Safe fallback when invoked from standalone CLI/test scripts outside Next.js request context
  }
}

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function pruneBackups(maxKeep = 20) {
  try {
    ensureBackupsDir();
    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const full = path.join(BACKUPS_DIR, f);
        const stat = fs.statSync(full);
        return { f, full, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    for (const old of files.slice(maxKeep)) {
      fs.unlinkSync(old.full);
    }
  } catch {
    // Non-fatal
  }
}

export function listServerBackups(): ServerBackupFileInfo[] {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    return fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith(".json") && !f.includes(".."))
      .map((fileName) => {
        const full = path.join(BACKUPS_DIR, fileName);
        const stat = fs.statSync(full);
        let bundleType: ServerBackupFileInfo["bundleType"] = "unknown";
        if (fileName.includes("catalog-bundle")) bundleType = "catalog-bundle";
        else if (fileName.includes("site-data")) bundleType = "site-data";
        else if (fileName.includes("site-settings")) bundleType = "site-settings";
        else if (fileName.includes("pre-deploy-site-content")) {
          bundleType = "pre-deploy-site-content";
        }
        return {
          fileName,
          bundleType,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function readServerBackupFile(fileName: string): string | null {
  const safeName = path.basename(fileName);
  if (safeName !== fileName || !safeName.endsWith(".json")) return null;
  const full = path.join(BACKUPS_DIR, safeName);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

export async function getLiveBundleSummary() {
  const [
    categories,
    subCategories,
    podiumSubCategories,
    industries,
    problemStatements,
    products,
    siteContent,
    teamMembers,
    clients,
    onlinePlatforms,
    certificates,
    resources,
    galleryImages,
    machinery,
    pressArticles,
    infrastructureLocations,
    usefulLinks,
    siteSetting,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.subCategory.count(),
    prisma.podiumSubCategory.count(),
    prisma.industry.count(),
    prisma.problemStatement.count(),
    prisma.product.count(),
    prisma.siteContent.count({
      where: { NOT: { key: { startsWith: "system.bootstrap." } } },
    }),
    prisma.teamMember.count(),
    prisma.client.count(),
    prisma.onlinePlatform.count(),
    prisma.certificate.count(),
    prisma.resource.count(),
    prisma.galleryImage.count(),
    prisma.machinery.count(),
    prisma.pressArticle.count(),
    prisma.infrastructureLocation.count(),
    prisma.usefulLink.count(),
    prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: { id: true, email: true, phone1: true, updatedAt: true },
    }),
  ]);

  return {
    catalogBundle: {
      categories,
      subCategories,
      podiumSubCategories,
      industries,
      problemStatements,
      products,
    },
    siteData: {
      siteContent,
      teamMembers,
      clients,
      onlinePlatforms,
      certificates,
      resources,
      galleryImages,
      machinery,
      pressArticles,
      infrastructureLocations,
      usefulLinks,
    },
    siteSettings: {
      configured: Boolean(siteSetting),
      email: siteSetting?.email || null,
      phone1: siteSetting?.phone1 || null,
      updatedAt: siteSetting?.updatedAt ? siteSetting.updatedAt.toISOString() : null,
    },
    backups: listServerBackups(),
  };
}

/**
 * BUNDLE 1: Always exports Categories + Subcategories + Podium Sub-Categories +
 * Industries + Problem Statements + All Products (and child images/specs/features/variants) TOGETHER.
 * Never mixes SiteContent or SiteSetting.
 */
export async function exportCatalogBundle(): Promise<ExportEnvelope<CatalogBundleData>> {
  const [
    categories,
    subCategories,
    podiumSubCategories,
    industries,
    problemStatements,
    products,
  ] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.subCategory.findMany({
      include: { category: { select: { slug: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.podiumSubCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.industry.findMany({ orderBy: { name: "asc" } }),
    prisma.problemStatement.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      include: {
        category: { select: { slug: true } },
        subCategory: { select: { slug: true } },
        subCategories: { select: { slug: true } },
        podiumSubCategory: { select: { slug: true } },
        podiumSubCategories: { select: { slug: true } },
        industries: { select: { slug: true } },
        problemStatements: { select: { slug: true } },
        images: { orderBy: [{ isMain: "desc" }, { createdAt: "asc" }] },
        features: { orderBy: { createdAt: "asc" } },
        specifications: { orderBy: { createdAt: "asc" } },
        variants: {
          include: { images: { orderBy: { createdAt: "asc" } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const data: CatalogBundleData = {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl,
      bgClass: c.bgClass,
      description: c.description,
      descriptionHtml: c.descriptionHtml,
      sortOrder: c.sortOrder,
    })),
    subCategories: subCategories.map((sc) => ({
      id: sc.id,
      name: sc.name,
      slug: sc.slug,
      categorySlug: sc.category.slug,
      description: sc.description,
      descriptionHtml: sc.descriptionHtml,
      imageUrl: sc.imageUrl,
      sortOrder: sc.sortOrder,
    })),
    podiumSubCategories: podiumSubCategories.map((psc) => ({
      id: psc.id,
      name: psc.name,
      slug: psc.slug,
      description: psc.description,
      descriptionHtml: psc.descriptionHtml,
      imageUrl: psc.imageUrl,
      sortOrder: psc.sortOrder,
    })),
    industries: industries.map((ind) => ({
      id: ind.id,
      name: ind.name,
      slug: ind.slug,
      imageUrl: ind.imageUrl,
      description: ind.description,
      solutionGroupsJson: ind.solutionGroupsJson,
    })),
    problemStatements: problemStatements.map((ps) => ({
      id: ps.id,
      name: ps.name,
      slug: ps.slug,
      imageUrl: ps.imageUrl,
      description: ps.description,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      basePrice: p.basePrice,
      discountPrice: p.discountPrice,
      discountBadge: p.discountBadge,
      stockStatus: p.stockStatus,
      videoUrl: p.videoUrl,
      description: p.description,
      descriptionHtml: p.descriptionHtml,
      importantNoteHtml: p.importantNoteHtml,
      categorySlug: p.category.slug,
      subCategorySlug: p.subCategory?.slug || p.subCategories[0]?.slug || null,
      subCategorySlugs: Array.from(
        new Set(
          [p.subCategory?.slug, ...p.subCategories.map((s) => s.slug)].filter(
            (s): s is string => Boolean(s)
          )
        )
      ),
      isPodium: p.isPodium,
      podiumSubCategorySlug:
        p.podiumSubCategory?.slug || p.podiumSubCategories[0]?.slug || null,
      podiumSubCategorySlugs: Array.from(
        new Set(
          [
            p.podiumSubCategory?.slug,
            ...p.podiumSubCategories.map((s) => s.slug),
          ].filter((s): s is string => Boolean(s))
        )
      ),
      isRegisteredDesign: p.isRegisteredDesign,
      designRegistrationNo: p.designRegistrationNo,
      ipProtectionText: p.ipProtectionText,
      industrySlugs: p.industries.map((i) => i.slug),
      problemStatementSlugs: p.problemStatements.map((ps) => ps.slug),
      images: p.images.map((img) => ({ url: img.url, isMain: img.isMain })),
      features: p.features.map((f) => f.text),
      specifications: p.specifications.map((s) => ({
        name: s.name,
        value: s.value,
        type: s.type,
      })),
      variants: p.variants.map((v) => ({
        name: v.name,
        imageUrl: v.imageUrl,
        price: v.price,
        images: v.images.map((vi) => vi.url),
      })),
    })),
  };

  return {
    schemaVersion: "1.0",
    sourceApp: "classicconcepts",
    bundleType: "catalog-bundle",
    exportedAt: new Date().toISOString(),
    counts: {
      categories: data.categories.length,
      subCategories: data.subCategories.length,
      podiumSubCategories: data.podiumSubCategories.length,
      industries: data.industries.length,
      problemStatements: data.problemStatements.length,
      products: data.products.length,
    },
    data,
  };
}

/**
 * BUNDLE 2: Exports all inline-edited Site Texts, HTML & Image Overrides (`SiteContent`)
 * + non-product brand/showcase sections (`TeamMember`, `Client`, `OnlinePlatform`, `Certificate`,
 * `Resource`, `GalleryImage`, `Machinery`, `PressArticle`, `InfrastructureLocation`, `UsefulLink`).
 * Strictly excludes Categories/Subcategories/Products AND strictly excludes SiteSetting.
 */
export async function exportSiteDataBundle(): Promise<ExportEnvelope<SiteDataBundleData>> {
  const [
    siteContent,
    teamMembers,
    clients,
    onlinePlatforms,
    certificates,
    resources,
    galleryImages,
    machinery,
    pressArticles,
    infrastructureLocations,
    usefulLinks,
  ] = await Promise.all([
    prisma.siteContent.findMany({
      where: { NOT: { key: { startsWith: "system.bootstrap." } } },
      orderBy: { key: "asc" },
    }),
    prisma.teamMember.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.client.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.onlinePlatform.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.certificate.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.resource.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.galleryImage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.machinery.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.pressArticle.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.infrastructureLocation.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.usefulLink.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);

  const data: SiteDataBundleData = {
    siteContent: siteContent.map((sc) => ({
      key: sc.key,
      value: sc.value,
      type: sc.type,
    })),
    teamMembers: teamMembers.map((t) => ({
      id: t.id,
      name: t.name,
      position: t.position,
      photoUrl: t.photoUrl,
      phone: t.phone,
      whatsapp: t.whatsapp,
      email: t.email,
      bio: t.bio,
      sortOrder: t.sortOrder,
      isActive: t.isActive,
    })),
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      logoUrl: c.logoUrl,
      sector: c.sector,
      isFeatured: c.isFeatured,
    })),
    onlinePlatforms: onlinePlatforms.map((op) => ({
      id: op.id,
      name: op.name,
      storeUrl: op.storeUrl,
      storeRegion: op.storeRegion,
      iconName: op.iconName,
      colorClass: op.colorClass,
    })),
    certificates: certificates.map((c) => ({
      id: c.id,
      title: c.title,
      imageUrl: c.imageUrl,
      issuedBy: c.issuedBy,
      docType: c.docType,
      sortOrder: c.sortOrder,
    })),
    resources: resources.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      fileUrl: r.fileUrl,
      type: r.type,
      fileSize: r.fileSize,
      updatedLabel: r.updatedLabel,
      thumbnailUrl: r.thumbnailUrl,
      sortOrder: r.sortOrder,
    })),
    galleryImages: galleryImages.map((g) => ({
      id: g.id,
      url: g.url,
      altText: g.altText,
      sortOrder: g.sortOrder,
    })),
    machinery: machinery.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      imageUrl: m.imageUrl,
      sortOrder: m.sortOrder,
    })),
    pressArticles: pressArticles.map((p) => ({
      id: p.id,
      title: p.title,
      publication: p.publication,
      date: p.date,
      category: p.category,
      summary: p.summary,
      imageUrl: p.imageUrl,
      externalUrl: p.externalUrl,
      sortOrder: p.sortOrder,
    })),
    infrastructureLocations: infrastructureLocations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      imageUrl: loc.imageUrl,
      mapUrl: loc.mapUrl,
      sortOrder: loc.sortOrder,
    })),
    usefulLinks: usefulLinks.map((ul) => ({
      id: ul.id,
      title: ul.title,
      url: ul.url,
      isActive: ul.isActive,
      sortOrder: ul.sortOrder,
    })),
  };

  return {
    schemaVersion: "1.0",
    sourceApp: "classicconcepts",
    bundleType: "site-data",
    exportedAt: new Date().toISOString(),
    counts: {
      siteContent: data.siteContent.length,
      teamMembers: data.teamMembers.length,
      clients: data.clients.length,
      onlinePlatforms: data.onlinePlatforms.length,
      certificates: data.certificates.length,
      resources: data.resources.length,
      galleryImages: data.galleryImages.length,
      machinery: data.machinery.length,
      pressArticles: data.pressArticles.length,
      infrastructureLocations: data.infrastructureLocations.length,
      usefulLinks: data.usefulLinks.length,
    },
    data,
  };
}

/**
 * BUNDLE 3: Exports Site Settings (`SiteSetting` singleton) COMPLETELY SEPARATELY.
 * Never mixes Products/Categories or `SiteContent` page copy.
 */
export async function exportSiteSettingsBundle(options?: {
  includeSecrets?: boolean;
}): Promise<ExportEnvelope<SiteSettingsBundleData>> {
  const includeSecrets = Boolean(options?.includeSecrets);
  const row = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  const cleanSettings: Record<string, unknown> = {};
  if (row) {
    for (const [key, val] of Object.entries(row)) {
      if (key === "createdAt" || key === "updatedAt") continue;
      if (
        !includeSecrets &&
        (SECRET_SETTING_FIELDS as readonly string[]).includes(key)
      ) {
        cleanSettings[key] = val ? REDACTED_SECRET : null;
      } else {
        cleanSettings[key] = val;
      }
    }
  }

  return {
    schemaVersion: "1.0",
    sourceApp: "classicconcepts",
    bundleType: "site-settings",
    exportedAt: new Date().toISOString(),
    secretsRedacted: !includeSecrets,
    counts: {
      settingsFields: Object.keys(cleanSettings).length,
    },
    data: {
      settings: cleanSettings,
    },
  };
}

export async function savePreImportBackup(bundleType: BundleType): Promise<string> {
  ensureBackupsDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `pre-import-${bundleType}-${stamp}.json`;
  const fullPath = path.join(BACKUPS_DIR, fileName);

  const payload =
    bundleType === "catalog-bundle"
      ? await exportCatalogBundle()
      : bundleType === "site-data"
      ? await exportSiteDataBundle()
      : await exportSiteSettingsBundle({ includeSecrets: true });

  fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), "utf8");
  pruneBackups(20);
  return fileName;
}

export function inspectImportBundle(rawPayload: unknown, expectedType?: BundleType) {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new Error("Invalid JSON file: root must be a JSON object.");
  }

  const env = rawPayload as Partial<ExportEnvelope<Record<string, unknown>>>;
  const bundleType = env.bundleType;
  if (
    bundleType !== "catalog-bundle" &&
    bundleType !== "site-data" &&
    bundleType !== "site-settings"
  ) {
    throw new Error(
      `Unrecognized bundleType "${String(
        bundleType
      )}". Please upload a valid Classic Concepts export file (catalog-bundle, site-data, or site-settings).`
    );
  }

  if (expectedType && bundleType !== expectedType) {
    const friendlyExpected =
      expectedType === "catalog-bundle"
        ? "Product, Category & Subcategory Bundle"
        : expectedType === "site-data"
        ? "Site Texts, Images & Page Content Bundle"
        : "Site Settings Bundle";
    throw new Error(
      `Wrong bundle slot: this file is "${bundleType}", which cannot be imported into "${friendlyExpected}". Each bundle is strictly separated.`
    );
  }

  const data = env.data;
  if (!data || typeof data !== "object") {
    throw new Error("Invalid export file: missing `data` object.");
  }

  const warnings: string[] = [];
  const computedCounts: Record<string, number> = {};

  if (bundleType === "catalog-bundle") {
    const d = data as unknown as Partial<CatalogBundleData>;
    computedCounts.categories = Array.isArray(d.categories) ? d.categories.length : 0;
    computedCounts.subCategories = Array.isArray(d.subCategories)
      ? d.subCategories.length
      : 0;
    computedCounts.podiumSubCategories = Array.isArray(d.podiumSubCategories)
      ? d.podiumSubCategories.length
      : 0;
    computedCounts.industries = Array.isArray(d.industries) ? d.industries.length : 0;
    computedCounts.problemStatements = Array.isArray(d.problemStatements)
      ? d.problemStatements.length
      : 0;
    computedCounts.products = Array.isArray(d.products) ? d.products.length : 0;

    if (computedCounts.categories === 0 && computedCounts.products > 0) {
      warnings.push(
        "This file has products without parent categories; fallback categories will be created automatically."
      );
    }
  } else if (bundleType === "site-data") {
    const d = data as unknown as Partial<SiteDataBundleData>;
    for (const key of [
      "siteContent",
      "teamMembers",
      "clients",
      "onlinePlatforms",
      "certificates",
      "resources",
      "galleryImages",
      "machinery",
      "pressArticles",
      "infrastructureLocations",
      "usefulLinks",
    ] as const) {
      computedCounts[key] = Array.isArray(d[key]) ? d[key]!.length : 0;
    }
  } else if (bundleType === "site-settings") {
    const d = data as unknown as Partial<SiteSettingsBundleData>;
    const settingsObj = d.settings && typeof d.settings === "object" ? d.settings : {};
    computedCounts.settingsFields = Object.keys(settingsObj).length;
    if (env.secretsRedacted) {
      warnings.push(
        "API keys and SMTP password in this file were redacted on export; your live server keys will be safely retained."
      );
    }
  }

  return {
    valid: true,
    bundleType,
    exportedAt: env.exportedAt || null,
    secretsRedacted: Boolean(env.secretsRedacted),
    counts: computedCounts,
    warnings,
  };
}

/**
 * Imports BUNDLE 1: Categories + Subcategories + Podium Sub-Categories +
 * Industries + Problem Statements + Products together inside an atomic transaction.
 */
export async function importCatalogBundle(
  rawPayload: unknown,
  mode: ImportMode
): Promise<{
  backupFileName: string;
  mode: ImportMode;
  imported: Record<string, number>;
}> {
  inspectImportBundle(rawPayload, "catalog-bundle");
  const envelope = rawPayload as ExportEnvelope<CatalogBundleData>;
  const data = envelope.data;

  const backupFileName = await savePreImportBackup("catalog-bundle");

  const importedCounts = {
    categories: 0,
    subCategories: 0,
    podiumSubCategories: 0,
    industries: 0,
    problemStatements: 0,
    products: 0,
  };

  await prisma.$transaction(
    async (tx) => {
      if (mode === "replace") {
        // Cascade wipes ProductImage, ProductFeature, ProductSpecification, ProductVariant, ProductVariantImage
        await tx.product.deleteMany({});
        await tx.subCategory.deleteMany({});
        await tx.category.deleteMany({});
        await tx.podiumSubCategory.deleteMany({});
        await tx.industry.deleteMany({});
        await tx.problemStatement.deleteMany({});
      }

      const categoryIdBySlug = new Map<string, string>();
      const subCategoryIdBySlug = new Map<string, string>();
      const podiumSubCategoryIdBySlug = new Map<string, string>();
      const industryIdBySlug = new Map<string, string>();
      const problemIdBySlug = new Map<string, string>();

      // 1. Categories
      for (const cat of data.categories || []) {
        if (!cat?.slug || !cat?.name) continue;
        const saved = await tx.category.upsert({
          where: { slug: cat.slug },
          update: {
            name: cat.name,
            imageUrl: cat.imageUrl ?? null,
            bgClass: cat.bgClass ?? null,
            description: cat.description ?? null,
            descriptionHtml: cat.descriptionHtml ?? null,
            sortOrder: typeof cat.sortOrder === "number" ? cat.sortOrder : 0,
          },
          create: {
            ...(mode === "replace" && cat.id ? { id: cat.id } : {}),
            name: cat.name,
            slug: cat.slug,
            imageUrl: cat.imageUrl ?? null,
            bgClass: cat.bgClass ?? null,
            description: cat.description ?? null,
            descriptionHtml: cat.descriptionHtml ?? null,
            sortOrder: typeof cat.sortOrder === "number" ? cat.sortOrder : 0,
          },
        });
        categoryIdBySlug.set(saved.slug, saved.id);
        importedCounts.categories++;
      }

      // Include existing categories in map for merge mode
      if (mode === "merge") {
        const allCats = await tx.category.findMany({ select: { id: true, slug: true } });
        for (const c of allCats) categoryIdBySlug.set(c.slug, c.id);
      }

      // 2. SubCategories
      for (const sc of data.subCategories || []) {
        if (!sc?.slug || !sc?.name || !sc?.categorySlug) continue;
        let parentCategoryId = categoryIdBySlug.get(sc.categorySlug);
        if (!parentCategoryId) {
          const fallbackParent = await tx.category.upsert({
            where: { slug: sc.categorySlug },
            update: {},
            create: {
              name: sc.categorySlug
                .replace(/-/g, " ")
                .replace(/\b\w/g, (m) => m.toUpperCase()),
              slug: sc.categorySlug,
            },
          });
          parentCategoryId = fallbackParent.id;
          categoryIdBySlug.set(fallbackParent.slug, fallbackParent.id);
        }

        const saved = await tx.subCategory.upsert({
          where: { slug: sc.slug },
          update: {
            name: sc.name,
            categoryId: parentCategoryId,
            description: sc.description ?? null,
            descriptionHtml: sc.descriptionHtml ?? null,
            imageUrl: sc.imageUrl ?? null,
            sortOrder: typeof sc.sortOrder === "number" ? sc.sortOrder : 0,
          },
          create: {
            ...(mode === "replace" && sc.id ? { id: sc.id } : {}),
            name: sc.name,
            slug: sc.slug,
            categoryId: parentCategoryId,
            description: sc.description ?? null,
            descriptionHtml: sc.descriptionHtml ?? null,
            imageUrl: sc.imageUrl ?? null,
            sortOrder: typeof sc.sortOrder === "number" ? sc.sortOrder : 0,
          },
        });
        subCategoryIdBySlug.set(saved.slug, saved.id);
        importedCounts.subCategories++;
      }

      if (mode === "merge") {
        const allSubs = await tx.subCategory.findMany({ select: { id: true, slug: true } });
        for (const sc of allSubs) subCategoryIdBySlug.set(sc.slug, sc.id);
      }

      // 3. Podium Sub-Categories
      for (const psc of data.podiumSubCategories || []) {
        if (!psc?.slug || !psc?.name) continue;
        const saved = await tx.podiumSubCategory.upsert({
          where: { slug: psc.slug },
          update: {
            name: psc.name,
            description: psc.description ?? null,
            descriptionHtml: psc.descriptionHtml ?? null,
            imageUrl: psc.imageUrl ?? null,
            sortOrder: typeof psc.sortOrder === "number" ? psc.sortOrder : 0,
          },
          create: {
            ...(mode === "replace" && psc.id ? { id: psc.id } : {}),
            name: psc.name,
            slug: psc.slug,
            description: psc.description ?? null,
            descriptionHtml: psc.descriptionHtml ?? null,
            imageUrl: psc.imageUrl ?? null,
            sortOrder: typeof psc.sortOrder === "number" ? psc.sortOrder : 0,
          },
        });
        podiumSubCategoryIdBySlug.set(saved.slug, saved.id);
        importedCounts.podiumSubCategories++;
      }

      if (mode === "merge") {
        const allPodiumSubs = await tx.podiumSubCategory.findMany({
          select: { id: true, slug: true },
        });
        for (const psc of allPodiumSubs) podiumSubCategoryIdBySlug.set(psc.slug, psc.id);
      }

      // 4. Industries
      for (const ind of data.industries || []) {
        if (!ind?.slug || !ind?.name) continue;
        const saved = await tx.industry.upsert({
          where: { slug: ind.slug },
          update: {
            name: ind.name,
            imageUrl: ind.imageUrl ?? null,
            description: ind.description ?? null,
            solutionGroupsJson: ind.solutionGroupsJson ?? null,
          },
          create: {
            ...(mode === "replace" && ind.id ? { id: ind.id } : {}),
            name: ind.name,
            slug: ind.slug,
            imageUrl: ind.imageUrl ?? null,
            description: ind.description ?? null,
            solutionGroupsJson: ind.solutionGroupsJson ?? null,
          },
        });
        industryIdBySlug.set(saved.slug, saved.id);
        importedCounts.industries++;
      }

      if (mode === "merge") {
        const allInds = await tx.industry.findMany({ select: { id: true, slug: true } });
        for (const ind of allInds) industryIdBySlug.set(ind.slug, ind.id);
      }

      // 5. Problem Statements
      for (const ps of data.problemStatements || []) {
        if (!ps?.slug || !ps?.name) continue;
        const saved = await tx.problemStatement.upsert({
          where: { slug: ps.slug },
          update: {
            name: ps.name,
            imageUrl: ps.imageUrl ?? null,
            description: ps.description ?? null,
          },
          create: {
            ...(mode === "replace" && ps.id ? { id: ps.id } : {}),
            name: ps.name,
            slug: ps.slug,
            imageUrl: ps.imageUrl ?? null,
            description: ps.description ?? null,
          },
        });
        problemIdBySlug.set(saved.slug, saved.id);
        importedCounts.problemStatements++;
      }

      if (mode === "merge") {
        const allPs = await tx.problemStatement.findMany({
          select: { id: true, slug: true },
        });
        for (const ps of allPs) problemIdBySlug.set(ps.slug, ps.id);
      }

      // 6. Products + All Child Relations
      const seenSkusInBatch = new Set<string>();

      for (const prod of data.products || []) {
        if (!prod?.slug || !prod?.name) continue;

        let categoryId = prod.categorySlug
          ? categoryIdBySlug.get(prod.categorySlug)
          : undefined;

        if (!categoryId) {
          const fallbackSlug = prod.categorySlug || "general-products";
          const fallbackCat = await tx.category.upsert({
            where: { slug: fallbackSlug },
            update: {},
            create: {
              name: fallbackSlug
                .replace(/-/g, " ")
                .replace(/\b\w/g, (m) => m.toUpperCase()),
              slug: fallbackSlug,
            },
          });
          categoryId = fallbackCat.id;
          categoryIdBySlug.set(fallbackCat.slug, fallbackCat.id);
        }

        const allSubSlugs = Array.from(
          new Set(
            [prod.subCategorySlug, ...(prod.subCategorySlugs || [])].filter(
              (s): s is string =>
                typeof s === "string" && Boolean(s) && subCategoryIdBySlug.has(s)
            )
          )
        );
        const subCategoryId = allSubSlugs[0]
          ? subCategoryIdBySlug.get(allSubSlugs[0]) || null
          : null;
        const subCategoryConnect = allSubSlugs.map((slug) => ({ slug }));

        const allPodiumSubSlugs = Array.from(
          new Set(
            [
              prod.podiumSubCategorySlug,
              ...(prod.podiumSubCategorySlugs || []),
            ].filter(
              (s): s is string =>
                typeof s === "string" &&
                Boolean(s) &&
                podiumSubCategoryIdBySlug.has(s)
            )
          )
        );
        const podiumSubCategoryId = allPodiumSubSlugs[0]
          ? podiumSubCategoryIdBySlug.get(allPodiumSubSlugs[0]) || null
          : null;
        const podiumSubCategoryConnect = allPodiumSubSlugs.map((slug) => ({
          slug,
        }));

        // Safe SKU resolution (prevent unique constraint crash if another slug holds the SKU)
        let resolvedSku =
          typeof prod.sku === "string" && prod.sku.trim() ? prod.sku.trim() : null;
        if (resolvedSku) {
          if (seenSkusInBatch.has(resolvedSku)) {
            resolvedSku = `${resolvedSku}-${prod.slug.slice(0, 6)}`;
          } else if (mode === "merge") {
            const conflicting = await tx.product.findUnique({
              where: { sku: resolvedSku },
              select: { slug: true },
            });
            if (conflicting && conflicting.slug !== prod.slug) {
              resolvedSku = `${resolvedSku}-${prod.slug.slice(0, 6)}`;
            }
          }
          seenSkusInBatch.add(resolvedSku);
        }

        const industryConnect = (prod.industrySlugs || [])
          .filter((s) => industryIdBySlug.has(s))
          .map((slug) => ({ slug }));
        const problemConnect = (prod.problemStatementSlugs || [])
          .filter((s) => problemIdBySlug.has(s))
          .map((slug) => ({ slug }));

        const savedProduct = await tx.product.upsert({
          where: { slug: prod.slug },
          update: {
            name: prod.name,
            sku: resolvedSku,
            basePrice: typeof prod.basePrice === "number" ? prod.basePrice : null,
            discountPrice:
              typeof prod.discountPrice === "number" ? prod.discountPrice : null,
            discountBadge: prod.discountBadge ?? null,
            stockStatus: prod.stockStatus || "In stock",
            videoUrl: prod.videoUrl ?? null,
            description: prod.description ?? null,
            descriptionHtml: prod.descriptionHtml ?? null,
            importantNoteHtml: prod.importantNoteHtml ?? null,
            categoryId,
            subCategoryId,
            subCategories: { set: subCategoryConnect },
            isPodium: Boolean(prod.isPodium),
            podiumSubCategoryId,
            podiumSubCategories: { set: podiumSubCategoryConnect },
            isRegisteredDesign:
              typeof prod.isRegisteredDesign === "boolean"
                ? prod.isRegisteredDesign
                : true,
            designRegistrationNo: prod.designRegistrationNo ?? null,
            ipProtectionText: prod.ipProtectionText ?? null,
            industries: { set: industryConnect },
            problemStatements: { set: problemConnect },
          },
          create: {
            ...(mode === "replace" && prod.id ? { id: prod.id } : {}),
            name: prod.name,
            slug: prod.slug,
            sku: resolvedSku,
            basePrice: typeof prod.basePrice === "number" ? prod.basePrice : null,
            discountPrice:
              typeof prod.discountPrice === "number" ? prod.discountPrice : null,
            discountBadge: prod.discountBadge ?? null,
            stockStatus: prod.stockStatus || "In stock",
            videoUrl: prod.videoUrl ?? null,
            description: prod.description ?? null,
            descriptionHtml: prod.descriptionHtml ?? null,
            importantNoteHtml: prod.importantNoteHtml ?? null,
            categoryId,
            subCategoryId,
            subCategories: { connect: subCategoryConnect },
            isPodium: Boolean(prod.isPodium),
            podiumSubCategoryId,
            podiumSubCategories: { connect: podiumSubCategoryConnect },
            isRegisteredDesign:
              typeof prod.isRegisteredDesign === "boolean"
                ? prod.isRegisteredDesign
                : true,
            designRegistrationNo: prod.designRegistrationNo ?? null,
            ipProtectionText: prod.ipProtectionText ?? null,
            industries: { connect: industryConnect },
            problemStatements: { connect: problemConnect },
          },
        });

        const productId = savedProduct.id;

        if (mode === "merge") {
          await tx.productImage.deleteMany({ where: { productId } });
          await tx.productFeature.deleteMany({ where: { productId } });
          await tx.productSpecification.deleteMany({ where: { productId } });
          await tx.productVariant.deleteMany({ where: { productId } });
        }

        if (Array.isArray(prod.images) && prod.images.length > 0) {
          const validImgs = prod.images.filter((img) => Boolean(img?.url));
          if (validImgs.length > 0) {
            await tx.productImage.createMany({
              data: validImgs.map((img, i) => ({
                productId,
                url: img.url,
                isMain:
                  typeof img.isMain === "boolean" ? img.isMain : i === 0,
              })),
            });
          }
        }

        if (Array.isArray(prod.features) && prod.features.length > 0) {
          const validFeatures = prod.features
            .map((f) => String(f ?? "").trim())
            .filter(Boolean);
          if (validFeatures.length > 0) {
            await tx.productFeature.createMany({
              data: validFeatures.map((text) => ({ productId, text })),
            });
          }
        }

        if (Array.isArray(prod.specifications) && prod.specifications.length > 0) {
          const validSpecs = prod.specifications.filter(
            (s) => Boolean(s?.name) && Boolean(s?.value)
          );
          if (validSpecs.length > 0) {
            await tx.productSpecification.createMany({
              data: validSpecs.map((s) => ({
                productId,
                name: s.name,
                value: s.value,
                type: s.type === "dimension" ? "dimension" : "specification",
              })),
            });
          }
        }

        if (Array.isArray(prod.variants) && prod.variants.length > 0) {
          for (const v of prod.variants) {
            if (!v?.name) continue;
            const variantImgs = Array.isArray(v.images)
              ? v.images.filter(Boolean)
              : [];
            await tx.productVariant.create({
              data: {
                productId,
                name: v.name,
                imageUrl: v.imageUrl ?? variantImgs[0] ?? null,
                price: typeof v.price === "number" ? v.price : null,
                images:
                  variantImgs.length > 0
                    ? { create: variantImgs.map((url) => ({ url })) }
                    : undefined,
              },
            });
          }
        }

        importedCounts.products++;
      }
    },
    { maxWait: 15000, timeout: 120000 }
  );

  await invalidateCacheTags(["catalog", "taxonomy", "ai-snapshot", "ai-responses"]);
  invalidateAiCatalogCache();
  safeRevalidateAll();

  return {
    backupFileName,
    mode,
    imported: importedCounts,
  };
}

/**
 * Imports BUNDLE 2: Site Texts, HTML & Image Overrides (`SiteContent`) +
 * non-product brand/page content sections (`TeamMember`, `Client`, `OnlinePlatform`,
 * `Certificate`, `Resource`, `GalleryImage`, `Machinery`, `PressArticle`,
 * `InfrastructureLocation`, `UsefulLink`).
 * Leaves Categories/Subcategories/Products AND `SiteSetting` 100% untouched.
 */
export async function importSiteDataBundle(
  rawPayload: unknown,
  mode: ImportMode
): Promise<{
  backupFileName: string;
  mode: ImportMode;
  imported: Record<string, number>;
}> {
  inspectImportBundle(rawPayload, "site-data");
  const envelope = rawPayload as ExportEnvelope<SiteDataBundleData>;
  const data = envelope.data;

  const backupFileName = await savePreImportBackup("site-data");

  const importedCounts: Record<string, number> = {
    siteContent: 0,
    teamMembers: 0,
    clients: 0,
    onlinePlatforms: 0,
    certificates: 0,
    resources: 0,
    galleryImages: 0,
    machinery: 0,
    pressArticles: 0,
    infrastructureLocations: 0,
    usefulLinks: 0,
  };

  await prisma.$transaction(
    async (tx) => {
      if (mode === "replace") {
        await tx.siteContent.deleteMany({
          where: { NOT: { key: { startsWith: "system.bootstrap." } } },
        });
        await tx.teamMember.deleteMany({});
        await tx.client.deleteMany({});
        await tx.onlinePlatform.deleteMany({});
        await tx.certificate.deleteMany({});
        await tx.resource.deleteMany({});
        await tx.galleryImage.deleteMany({});
        await tx.machinery.deleteMany({});
        await tx.pressArticle.deleteMany({});
        await tx.infrastructureLocation.deleteMany({});
        await tx.usefulLink.deleteMany({});
      }

      for (const sc of data.siteContent || []) {
        if (!sc?.key || sc.key.startsWith("system.bootstrap.")) continue;
        await tx.siteContent.upsert({
          where: { key: sc.key },
          update: { value: String(sc.value ?? ""), type: sc.type || "text" },
          create: {
            key: sc.key,
            value: String(sc.value ?? ""),
            type: sc.type || "text",
          },
        });
        importedCounts.siteContent++;
      }

      for (const tm of data.teamMembers || []) {
        if (!tm?.name) continue;
        const payload = {
          name: tm.name,
          position: tm.position || "",
          photoUrl: tm.photoUrl ?? null,
          phone: tm.phone ?? null,
          whatsapp: tm.whatsapp ?? null,
          email: tm.email ?? null,
          bio: tm.bio ?? null,
          sortOrder: typeof tm.sortOrder === "number" ? tm.sortOrder : 0,
          isActive: typeof tm.isActive === "boolean" ? tm.isActive : true,
        };
        if (tm.id) {
          await tx.teamMember.upsert({
            where: { id: tm.id },
            update: payload,
            create: { id: tm.id, ...payload },
          });
        } else {
          await tx.teamMember.create({ data: payload });
        }
        importedCounts.teamMembers++;
      }

      for (const cl of data.clients || []) {
        if (!cl?.name) continue;
        const payload = {
          name: cl.name,
          logoUrl: cl.logoUrl ?? null,
          sector: cl.sector ?? null,
          isFeatured: Boolean(cl.isFeatured),
        };
        if (cl.id) {
          await tx.client.upsert({
            where: { id: cl.id },
            update: payload,
            create: { id: cl.id, ...payload },
          });
        } else {
          await tx.client.create({ data: payload });
        }
        importedCounts.clients++;
      }

      for (const op of data.onlinePlatforms || []) {
        if (!op?.name) continue;
        const payload = {
          name: op.name,
          storeUrl: op.storeUrl || "#",
          storeRegion: op.storeRegion || "",
          iconName: op.iconName || "FaStore",
          colorClass: op.colorClass ?? null,
        };
        if (op.id) {
          await tx.onlinePlatform.upsert({
            where: { id: op.id },
            update: payload,
            create: { id: op.id, ...payload },
          });
        } else {
          await tx.onlinePlatform.create({ data: payload });
        }
        importedCounts.onlinePlatforms++;
      }

      for (const cert of data.certificates || []) {
        if (!cert?.title || !cert?.imageUrl) continue;
        const payload = {
          title: cert.title,
          imageUrl: cert.imageUrl,
          issuedBy: cert.issuedBy ?? null,
          docType: cert.docType || "certification",
          sortOrder: typeof cert.sortOrder === "number" ? cert.sortOrder : 0,
        };
        if (cert.id) {
          await tx.certificate.upsert({
            where: { id: cert.id },
            update: payload,
            create: { id: cert.id, ...payload },
          });
        } else {
          await tx.certificate.create({ data: payload });
        }
        importedCounts.certificates++;
      }

      for (const res of data.resources || []) {
        if (!res?.title || !res?.fileUrl) continue;
        const payload = {
          title: res.title,
          description: res.description ?? null,
          fileUrl: res.fileUrl,
          type: res.type || "PDF",
          fileSize: res.fileSize ?? null,
          updatedLabel: res.updatedLabel ?? null,
          thumbnailUrl: res.thumbnailUrl ?? null,
          sortOrder: typeof res.sortOrder === "number" ? res.sortOrder : 0,
        };
        if (res.id) {
          await tx.resource.upsert({
            where: { id: res.id },
            update: payload,
            create: { id: res.id, ...payload },
          });
        } else {
          await tx.resource.create({ data: payload });
        }
        importedCounts.resources++;
      }

      for (const gi of data.galleryImages || []) {
        if (!gi?.url) continue;
        const payload = {
          url: gi.url,
          altText: gi.altText ?? null,
          sortOrder: typeof gi.sortOrder === "number" ? gi.sortOrder : 0,
        };
        if (gi.id) {
          await tx.galleryImage.upsert({
            where: { id: gi.id },
            update: payload,
            create: { id: gi.id, ...payload },
          });
        } else {
          await tx.galleryImage.create({ data: payload });
        }
        importedCounts.galleryImages++;
      }

      for (const mach of data.machinery || []) {
        if (!mach?.name || !mach?.imageUrl) continue;
        const payload = {
          name: mach.name,
          description: mach.description ?? null,
          imageUrl: mach.imageUrl,
          sortOrder: typeof mach.sortOrder === "number" ? mach.sortOrder : 0,
        };
        if (mach.id) {
          await tx.machinery.upsert({
            where: { id: mach.id },
            update: payload,
            create: { id: mach.id, ...payload },
          });
        } else {
          await tx.machinery.create({ data: payload });
        }
        importedCounts.machinery++;
      }

      for (const pa of data.pressArticles || []) {
        if (!pa?.title) continue;
        const payload = {
          title: pa.title,
          publication: pa.publication ?? null,
          date: pa.date ?? null,
          category: pa.category || "Newspaper",
          summary: pa.summary ?? null,
          imageUrl: pa.imageUrl ?? null,
          externalUrl: pa.externalUrl ?? null,
          sortOrder: typeof pa.sortOrder === "number" ? pa.sortOrder : 0,
        };
        if (pa.id) {
          await tx.pressArticle.upsert({
            where: { id: pa.id },
            update: payload,
            create: { id: pa.id, ...payload },
          });
        } else {
          await tx.pressArticle.create({ data: payload });
        }
        importedCounts.pressArticles++;
      }

      for (const loc of data.infrastructureLocations || []) {
        if (!loc?.name || !loc?.imageUrl) continue;
        const payload = {
          name: loc.name,
          imageUrl: loc.imageUrl,
          mapUrl: loc.mapUrl ?? null,
          sortOrder: typeof loc.sortOrder === "number" ? loc.sortOrder : 0,
        };
        if (loc.id) {
          await tx.infrastructureLocation.upsert({
            where: { id: loc.id },
            update: payload,
            create: { id: loc.id, ...payload },
          });
        } else {
          await tx.infrastructureLocation.create({ data: payload });
        }
        importedCounts.infrastructureLocations++;
      }

      for (const ul of data.usefulLinks || []) {
        if (!ul?.title || !ul?.url) continue;
        const payload = {
          title: ul.title,
          url: ul.url,
          isActive: typeof ul.isActive === "boolean" ? ul.isActive : true,
          sortOrder: typeof ul.sortOrder === "number" ? ul.sortOrder : 0,
        };
        if (ul.id) {
          await tx.usefulLink.upsert({
            where: { id: ul.id },
            update: payload,
            create: { id: ul.id, ...payload },
          });
        } else {
          await tx.usefulLink.create({ data: payload });
        }
        importedCounts.usefulLinks++;
      }
    },
    { maxWait: 15000, timeout: 60000 }
  );

  await invalidateSiteContentCache();
  await invalidateCacheTags(["site-content", "brand", "settings", "ai-snapshot"]);
  invalidateAiCatalogCache();
  safeRevalidateAll();

  return {
    backupFileName,
    mode,
    imported: importedCounts,
  };
}

const ALLOWED_SITE_SETTING_COLUMNS = [
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
  "smtpHost",
  "smtpPort",
  "smtpUser",
  "smtpPass",
  "adminEmail",
  "mapEmbedUrl",
  "googleAnalyticsId",
  "headScripts",
  "bodyScripts",
  "clientCarouselSpeed",
  "anthropicApiKey",
  "anthropicClientApiKey",
  "anthropicAdminApiKey",
  "aiModel",
  "aiEnabled",
  "aiPopupEnabled",
  "aiPopupDelaySeconds",
] as const;

/**
 * Imports BUNDLE 3: `SiteSetting` singleton COMPLETELY SEPARATELY.
 * Automatically retains live server API keys & SMTP password if the file had redacted secrets.
 * Leaves Products/Categories and `SiteContent` 100% untouched.
 */
export async function importSiteSettingsBundle(
  rawPayload: unknown,
  mode: ImportMode
): Promise<{
  backupFileName: string;
  mode: ImportMode;
  updatedFields: number;
}> {
  inspectImportBundle(rawPayload, "site-settings");
  const envelope = rawPayload as ExportEnvelope<SiteSettingsBundleData>;
  const incoming = (envelope.data?.settings || {}) as Record<string, unknown>;

  const backupFileName = await savePreImportBackup("site-settings");

  const existing = await prisma.siteSetting.findUnique({
    where: { id: "default" },
  });
  const existingRecord = (existing || {}) as Record<string, unknown>;

  const patchData: Record<string, unknown> = {};
  let updatedFields = 0;

  for (const col of ALLOWED_SITE_SETTING_COLUMNS) {
    if (!(col in incoming)) continue;
    const rawVal = incoming[col];

    // Never overwrite live server secrets with "__REDACTED__"
    if (
      (SECRET_SETTING_FIELDS as readonly string[]).includes(col) &&
      (rawVal === REDACTED_SECRET || rawVal === undefined)
    ) {
      continue;
    }

    if (mode === "merge") {
      // Safe retention mode: skip empty/null incoming values when live DB already has a value
      const isBlank =
        rawVal === null ||
        rawVal === undefined ||
        (typeof rawVal === "string" && rawVal.trim() === "");
      const existingHasValue =
        existingRecord[col] !== null &&
        existingRecord[col] !== undefined &&
        String(existingRecord[col]).trim() !== "";
      if (isBlank && existingHasValue) {
        continue;
      }
    }

    // Enforce ACRIO model rule (`claude-haiku-5-5`)
    if (col === "aiModel") {
      patchData[col] = "claude-haiku-5-5";
      updatedFields++;
      continue;
    }

    patchData[col] = rawVal;
    updatedFields++;
  }

  // Ensure required NOT NULL fields always have valid strings
  const fallbackAddress =
    String(
      patchData.address ||
        existingRecord.address ||
        "M/s. Classic Concepts Acrylic Private Limited, Secunderabad - 500 015, Telangana, India"
    ).trim();
  const fallbackPhone1 = String(
    patchData.phone1 || existingRecord.phone1 || "+917337222876"
  ).trim();
  const fallbackEmail = String(
    patchData.email || existingRecord.email || "sales@classicconcepts.in"
  ).trim();

  await prisma.siteSetting.upsert({
    where: { id: "default" },
    update: {
      ...patchData,
      address: fallbackAddress,
      phone1: fallbackPhone1,
      email: fallbackEmail,
    },
    create: {
      id: "default",
      ...patchData,
      address: fallbackAddress,
      phone1: fallbackPhone1,
      email: fallbackEmail,
      aiModel: "claude-haiku-5-5",
    },
  });

  await invalidateCacheTags(["settings", "brand", "ai-snapshot", "ai-responses"]);
  invalidateAiSettingsCache();
  invalidateAiCatalogCache();
  safeRevalidateAll();

  return {
    backupFileName,
    mode,
    updatedFields,
  };
}
