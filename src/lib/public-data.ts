import { prisma } from "@/lib/db";
import {
  getAiRuntimeSettings,
  getKnowledgeSnapshot,
  hydrateAiResponsesIntoRedis,
} from "@/lib/ai-context";
import { registerCacheWarmHandler, rememberCached } from "@/lib/redis-cache";
import { getSiteContentMap, type SiteContentMap } from "@/lib/site-content";

const PUBLIC_TTL_SECONDS = 3600; // 1 hour in 100MB Redis + instant tag-version invalidation on admin edits
const DETAIL_NOT_FOUND_TTL_SECONDS = 120; // Protect SQLite against bot 404 scans

export const OFFICIAL_WHATSAPP_API_NUMBER = "+91 73372 20568";
export const OFFICIAL_WHATSAPP_API_DIGITS = "917337220568";

export function normalizeOfficialWhatsAppNumber(raw?: string | null): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (
    !digits ||
    /7337222876|9393939773|7901650662|7901650663|9849050752|9346763253/.test(
      digits
    )
  ) {
    return OFFICIAL_WHATSAPP_API_NUMBER;
  }
  return OFFICIAL_WHATSAPP_API_NUMBER;
}

export interface PublicSiteSettings {
  id: string;
  address: string;
  phone1: string;
  phone2: string | null;
  whatsappNumber: string | null;
  email: string;
  email2: string | null;
  businessHours: string | null;
  upiId: string | null;
  upiName: string | null;
  aboutIntroImage: string | null;
  aboutCertIso: string | null;
  aboutCertHym: string | null;
  aboutCertGa: string | null;
  aboutCertAscb: string | null;
  infraVideoUrl: string | null;
  pressVideoUrl: string | null;
  homeVideoUrl: string | null;
  pressClipping1: string | null;
  pressClipping2: string | null;
  mapEmbedUrl: string | null;
  googleAnalyticsId: string | null;
  headScripts: string | null;
  bodyScripts: string | null;
  clientCarouselSpeed: number;
  aiEnabled: boolean;
  aiPopupEnabled: boolean;
  aiPopupDelaySeconds: number;
  updatedAt: string;
}

export interface CachedCatalogCard {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  basePrice: number | null;
  discountPrice: number | null;
  discountBadge: string | null;
  stockStatus: string;
  isPodium: boolean;
  isRegisteredDesign: boolean;
  designRegistrationNo: string | null;
  ipProtectionText: string | null;
  categoryId: string;
  images: { url: string; isMain: boolean }[];
  category: { name: string; slug: string };
  subCategory: { id: string; name: string; slug: string } | null;
  podiumSubCategory: { name: string; slug: string } | null;
  subCategoryIds: string[];
  subCategorySlugs: string[];
  podiumSubCategoryIds: string[];
  podiumSubCategorySlugs: string[];
  industryIds: string[];
  problemStatementIds: string[];
  updatedAt: string;
}

export interface CachedSubCategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  descriptionHtml: string | null;
  imageUrl: string | null;
  sortOrder: number;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  _count: {
    products: number;
    multiProducts: number;
  };
}

export interface CachedCategoryNode {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  bgClass: string | null;
  description: string | null;
  descriptionHtml: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  subCategories: CachedSubCategoryNode[];
  _count: {
    products: number;
    subCategories: number;
    podiumProducts: number;
  };
}

export interface CachedPodiumSubCategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  descriptionHtml: string | null;
  imageUrl: string | null;
  sortOrder: number;
  updatedAt: string;
  _count: {
    products: number;
    multiProducts: number;
  };
}

export interface CachedIndustryNode {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  solutionGroupsJson: string | null;
  updatedAt: string;
  products: { name: string }[];
  _count: {
    products: number;
  };
}

export interface CachedProblemStatementNode {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  updatedAt: string;
  products: { name: string }[];
  _count: {
    products: number;
  };
}

export interface FullCatalogIndex {
  products: CachedCatalogCard[];
  totalProductsOverall: number;
  allPodiumsCount: number;
  categories: CachedCategoryNode[];
  podiumSubCategories: CachedPodiumSubCategoryNode[];
  industries: CachedIndustryNode[];
  problemStatements: CachedProblemStatementNode[];
}

export interface CachedProductDetail {
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
  isPodium: boolean;
  isRegisteredDesign: boolean;
  designRegistrationNo: string | null;
  ipProtectionText: string | null;
  category: { id: string; name: string; slug: string };
  subCategory: { id: string; name: string; slug: string } | null;
  subCategories: { id: string; name: string; slug: string }[];
  podiumSubCategory: { id: string; name: string; slug: string } | null;
  podiumSubCategories: { id: string; name: string; slug: string }[];
  problemStatements: { id: string; name: string }[];
  industries: { id: string; name: string }[];
  images: { id: string; url: string; isMain: boolean }[];
  features: { id: string; text: string }[];
  specifications: { id: string; name: string; value: string; type: string }[];
  variants: {
    id: string;
    name: string;
    price: number | null;
    imageUrl: string | null;
    images: { id: string; url: string }[];
  }[];
}

export interface CachedBrandAssets {
  clients: {
    id: string;
    name: string;
    logoUrl: string | null;
    sector: string | null;
    isFeatured: boolean;
  }[];
  onlinePlatforms: {
    id: string;
    name: string;
    storeUrl: string;
    storeRegion: string;
    iconName: string;
    colorClass: string | null;
  }[];
  certificates: {
    id: string;
    title: string;
    imageUrl: string;
    issuedBy: string | null;
    docType: string;
    sortOrder: number;
  }[];
  resources: {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    type: string;
    fileSize: string | null;
    updatedLabel: string | null;
    thumbnailUrl: string | null;
    sortOrder: number;
  }[];
  machinery: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string;
    sortOrder: number;
  }[];
  locations: {
    id: string;
    name: string;
    imageUrl: string;
    mapUrl: string | null;
    sortOrder: number;
  }[];
  pressArticles: {
    id: string;
    title: string;
    publication: string | null;
    date: string | null;
    category: string;
    summary: string | null;
    imageUrl: string | null;
    externalUrl: string | null;
    sortOrder: number;
  }[];
  teamMembers: {
    id: string;
    name: string;
    position: string;
    photoUrl: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    bio: string | null;
    sortOrder: number;
  }[];
}

/**
 * Public non-secret site settings served from the 100MB Redis cache.
 */
export async function getPublicSiteSettings(): Promise<PublicSiteSettings | null> {
  return rememberCached<PublicSiteSettings | null>(
    "public:site-settings",
    ["settings"],
    PUBLIC_TTL_SECONDS,
    async () => {
      const row = await prisma.siteSetting.findUnique({
        where: { id: "default" },
        select: {
          id: true,
          address: true,
          phone1: true,
          phone2: true,
          whatsappNumber: true,
          email: true,
          email2: true,
          businessHours: true,
          upiId: true,
          upiName: true,
          aboutIntroImage: true,
          aboutCertIso: true,
          aboutCertHym: true,
          aboutCertGa: true,
          aboutCertAscb: true,
          infraVideoUrl: true,
          pressVideoUrl: true,
          homeVideoUrl: true,
          pressClipping1: true,
          pressClipping2: true,
          mapEmbedUrl: true,
          googleAnalyticsId: true,
          headScripts: true,
          bodyScripts: true,
          clientCarouselSpeed: true,
          aiEnabled: true,
          aiPopupEnabled: true,
          aiPopupDelaySeconds: true,
          updatedAt: true,
        },
      });
      if (!row) return null;
      return {
        ...row,
        whatsappNumber: normalizeOfficialWhatsAppNumber(row.whatsappNumber),
        updatedAt: row.updatedAt.toISOString(),
      };
    }
  );
}

export async function getCachedUsefulLinks(): Promise<
  { id: string; title: string; url: string }[]
> {
  return rememberCached(
    "public:useful-links",
    ["brand", "settings"],
    PUBLIC_TTL_SECONDS,
    async () => {
      return prisma.usefulLink.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, url: true },
      });
    }
  );
}

/**
 * Complete catalog + taxonomy index stored in the 100MB Redis cache (~400KB-1.5MB).
 * Enables < 0.3ms filtering for /shop, /shop?q=..., /shop/c/[slug], /podiums,
 * /podiums/[slug], /shop/industry/[slug], /shop/problem/[slug], /api/products/suggestions,
 * and /sitemap.xml with ZERO SQLite queries on client traffic!
 */
export async function getFullCatalogIndex(): Promise<FullCatalogIndex> {
  return rememberCached<FullCatalogIndex>(
    "public:catalog-index",
    ["catalog", "taxonomy"],
    PUBLIC_TTL_SECONDS,
    async () => {
      const [
        rawProducts,
        rawCategories,
        rawPodiumSubs,
        rawIndustries,
        rawProblemStatements,
      ] = await Promise.all([
        prisma.product.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            description: true,
            basePrice: true,
            discountPrice: true,
            discountBadge: true,
            stockStatus: true,
            isPodium: true,
            isRegisteredDesign: true,
            designRegistrationNo: true,
            ipProtectionText: true,
            categoryId: true,
            updatedAt: true,
            images: {
              select: { url: true, isMain: true },
              orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
              take: 1,
            },
            category: {
              select: { name: true, slug: true },
            },
            subCategory: {
              select: { id: true, name: true, slug: true },
            },
            subCategories: {
              select: { id: true, name: true, slug: true },
            },
            podiumSubCategory: {
              select: { id: true, name: true, slug: true },
            },
            podiumSubCategories: {
              select: { id: true, name: true, slug: true },
            },
            industries: {
              select: { id: true },
            },
            problemStatements: {
              select: { id: true },
            },
          },
        }),
        prisma.category.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: {
            subCategories: {
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              include: {
                _count: {
                  select: { products: true, multiProducts: true },
                },
              },
            },
            _count: {
              select: {
                products: true,
                subCategories: true,
              },
            },
          },
        }),
        prisma.podiumSubCategory.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: {
            _count: {
              select: { products: true, multiProducts: true },
            },
          },
        }),
        prisma.industry.findMany({
          orderBy: { name: "asc" },
          include: {
            products: {
              select: { name: true },
              take: 4,
            },
            _count: {
              select: { products: true },
            },
          },
        }),
        prisma.problemStatement.findMany({
          orderBy: { name: "asc" },
          include: {
            products: {
              select: { name: true },
              take: 4,
            },
            _count: {
              select: { products: true },
            },
          },
        }),
      ]);

      const podiumCountByCategoryId = new Map<string, number>();
      let allPodiumsCount = 0;

      const products: CachedCatalogCard[] = rawProducts.map((p) => {
        if (p.isPodium) {
          allPodiumsCount += 1;
          podiumCountByCategoryId.set(
            p.categoryId,
            (podiumCountByCategoryId.get(p.categoryId) || 0) + 1
          );
        }

        const subCategoryIds = Array.from(
          new Set([
            ...(p.subCategory ? [p.subCategory.id] : []),
            ...p.subCategories.map((s) => s.id),
          ])
        );
        const subCategorySlugs = Array.from(
          new Set([
            ...(p.subCategory ? [p.subCategory.slug] : []),
            ...p.subCategories.map((s) => s.slug),
          ])
        );
        const podiumSubCategoryIds = Array.from(
          new Set([
            ...(p.podiumSubCategory ? [p.podiumSubCategory.id] : []),
            ...p.podiumSubCategories.map((s) => s.id),
          ])
        );
        const podiumSubCategorySlugs = Array.from(
          new Set([
            ...(p.podiumSubCategory ? [p.podiumSubCategory.slug] : []),
            ...p.podiumSubCategories.map((s) => s.slug),
          ])
        );

        const primarySub = p.subCategory || p.subCategories[0] || null;
        const primaryPodiumSub = p.podiumSubCategory || p.podiumSubCategories[0] || null;

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          description: p.description,
          basePrice: p.basePrice,
          discountPrice: p.discountPrice,
          discountBadge: p.discountBadge,
          stockStatus: p.stockStatus,
          isPodium: p.isPodium,
          isRegisteredDesign: p.isRegisteredDesign,
          designRegistrationNo: p.designRegistrationNo,
          ipProtectionText: p.ipProtectionText,
          categoryId: p.categoryId,
          images: p.images,
          category: p.category,
          subCategory: primarySub,
          podiumSubCategory: primaryPodiumSub
            ? { name: primaryPodiumSub.name, slug: primaryPodiumSub.slug }
            : null,
          subCategoryIds,
          subCategorySlugs,
          podiumSubCategoryIds,
          podiumSubCategorySlugs,
          industryIds: p.industries.map((i) => i.id),
          problemStatementIds: p.problemStatements.map((ps) => ps.id),
          updatedAt: p.updatedAt.toISOString(),
        };
      });

      const categories: CachedCategoryNode[] = rawCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        imageUrl: cat.imageUrl,
        bgClass: cat.bgClass,
        description: cat.description,
        descriptionHtml: cat.descriptionHtml,
        sortOrder: cat.sortOrder,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
        subCategories: cat.subCategories.map((sub) => ({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          descriptionHtml: sub.descriptionHtml,
          imageUrl: sub.imageUrl,
          sortOrder: sub.sortOrder,
          categoryId: cat.id,
          categorySlug: cat.slug,
          categoryName: cat.name,
          _count: {
            products: sub._count.products,
            multiProducts: sub._count.multiProducts,
          },
        })),
        _count: {
          products: cat._count.products,
          subCategories: cat._count.subCategories,
          podiumProducts: podiumCountByCategoryId.get(cat.id) || 0,
        },
      }));

      const podiumSubCategories: CachedPodiumSubCategoryNode[] = rawPodiumSubs.map(
        (sub) => ({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          description: sub.description,
          descriptionHtml: sub.descriptionHtml,
          imageUrl: sub.imageUrl,
          sortOrder: sub.sortOrder,
          updatedAt: sub.updatedAt.toISOString(),
          _count: {
            products: sub._count.products,
            multiProducts: sub._count.multiProducts,
          },
        })
      );

      const industries: CachedIndustryNode[] = rawIndustries.map((ind) => ({
        id: ind.id,
        name: ind.name,
        slug: ind.slug,
        imageUrl: ind.imageUrl,
        description: ind.description,
        solutionGroupsJson: ind.solutionGroupsJson,
        updatedAt: ind.updatedAt.toISOString(),
        products: ind.products,
        _count: {
          products: ind._count.products,
        },
      }));

      const problemStatements: CachedProblemStatementNode[] =
        rawProblemStatements.map((ps) => ({
          id: ps.id,
          name: ps.name,
          slug: ps.slug,
          imageUrl: ps.imageUrl,
          description: ps.description,
          updatedAt: ps.updatedAt.toISOString(),
          products: ps.products,
          _count: {
            products: ps._count.products,
          },
        }));

      return {
        products,
        totalProductsOverall: products.length,
        allPodiumsCount,
        categories,
        podiumSubCategories,
        industries,
        problemStatements,
      };
    }
  );
}

/**
 * Shared public navigation/footer/chrome payload for `src/app/layout.tsx`.
 */
export async function getPublicChromeData(): Promise<{
  settings: PublicSiteSettings | null;
  usefulLinks: { id: string; title: string; url: string }[];
  categories: { id: string; name: string; slug: string }[];
  podiumSubCategories: { id: string; name: string; slug: string }[];
  siteContent: SiteContentMap;
}> {
  const [settings, usefulLinks, catalog, siteContent] = await Promise.all([
    getPublicSiteSettings(),
    getCachedUsefulLinks(),
    getFullCatalogIndex(),
    getSiteContentMap(),
  ]);

  const categories = catalog.categories
    .filter((c) => c._count.products > 0)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));

  const podiumSubCategories = catalog.podiumSubCategories.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
  }));

  return {
    settings,
    usefulLinks,
    categories,
    podiumSubCategories,
    siteContent,
  };
}

/**
 * Full Product Detail cached per slug in 100MB Redis (including negative-cache protection
 * so unknown/bot slugs don't hit SQLite repeatedly).
 */
export async function getCachedProductDetailBySlug(
  slug: string
): Promise<CachedProductDetail | null> {
  const cleanSlug = (slug || "").trim();
  if (!cleanSlug) return null;

  const wrapper = await rememberCached<{
    found: boolean;
    product: CachedProductDetail | null;
  }>(
    `public:product-detail:${cleanSlug}`,
    ["catalog", "taxonomy"],
    PUBLIC_TTL_SECONDS,
    async () => {
      const p = await prisma.product.findUnique({
        where: { slug: cleanSlug },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subCategory: { select: { id: true, name: true, slug: true } },
          subCategories: { select: { id: true, name: true, slug: true } },
          podiumSubCategory: { select: { id: true, name: true, slug: true } },
          podiumSubCategories: { select: { id: true, name: true, slug: true } },
          problemStatements: { select: { id: true, name: true } },
          industries: { select: { id: true, name: true } },
          images: {
            select: { id: true, url: true, isMain: true },
            orderBy: { createdAt: "asc" },
          },
          features: {
            select: { id: true, text: true },
            orderBy: { createdAt: "asc" },
          },
          specifications: {
            select: { id: true, name: true, value: true, type: true },
            orderBy: { createdAt: "asc" },
          },
          variants: {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              images: {
                select: { id: true, url: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!p) {
        return { found: false, product: null };
      }

      return {
        found: true,
        product: {
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
          isPodium: p.isPodium,
          isRegisteredDesign: p.isRegisteredDesign,
          designRegistrationNo: p.designRegistrationNo,
          ipProtectionText: p.ipProtectionText,
          category: p.category,
          subCategory: p.subCategory,
          subCategories: p.subCategories,
          podiumSubCategory: p.podiumSubCategory,
          podiumSubCategories: p.podiumSubCategories,
          problemStatements: p.problemStatements,
          industries: p.industries,
          images: p.images,
          features: p.features,
          specifications: p.specifications,
          variants: p.variants,
        },
      };
    }
  );

  // Shorten TTL if negative entry was stored? Even with tag invalidation, any new product
  // creation bumps `catalog` tag version immediately, so a newly created slug is NEVER blocked!
  void DETAIL_NOT_FOUND_TTL_SECONDS;
  return wrapper.product;
}

/**
 * Cached Brand, Trust, Media, Certificates, Resources, Machinery, Press & Team assets.
 */
export async function getCachedBrandAssets(): Promise<CachedBrandAssets> {
  return rememberCached<CachedBrandAssets>(
    "public:brand-assets",
    ["brand", "settings"],
    PUBLIC_TTL_SECONDS,
    async () => {
      const [
        clients,
        onlinePlatforms,
        certificates,
        resources,
        machinery,
        locations,
        pressArticles,
        teamMembers,
      ] = await Promise.all([
        prisma.client.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            logoUrl: true,
            sector: true,
            isFeatured: true,
          },
        }),
        prisma.onlinePlatform.findMany({
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            storeUrl: true,
            storeRegion: true,
            iconName: true,
            colorClass: true,
          },
        }),
        prisma.certificate.findMany({
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            issuedBy: true,
            docType: true,
            sortOrder: true,
          },
        }),
        prisma.resource.findMany({
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            fileUrl: true,
            type: true,
            fileSize: true,
            updatedLabel: true,
            thumbnailUrl: true,
            sortOrder: true,
          },
        }),
        prisma.machinery.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            sortOrder: true,
          },
        }),
        prisma.infrastructureLocation.findMany({
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            mapUrl: true,
            sortOrder: true,
          },
        }),
        prisma.pressArticle.findMany({
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            publication: true,
            date: true,
            category: true,
            summary: true,
            imageUrl: true,
            externalUrl: true,
            sortOrder: true,
          },
        }),
        prisma.teamMember.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            position: true,
            photoUrl: true,
            phone: true,
            whatsapp: true,
            email: true,
            bio: true,
            sortOrder: true,
          },
        }),
      ]);

      return {
        clients,
        onlinePlatforms,
        certificates,
        resources,
        machinery,
        locations,
        pressArticles,
        teamMembers,
      };
    }
  );
}

/**
 * Helper to look up a category by slug OR detect if a slug was converted into a SubCategory
 * directly from the 100MB Redis catalog index (0 SQLite queries).
 */
export async function lookupCategoryOrConvertedSubBySlug(slug: string): Promise<{
  category: CachedCategoryNode | null;
  convertedSub: CachedSubCategoryNode | null;
  catalog: FullCatalogIndex;
}> {
  const catalog = await getFullCatalogIndex();
  const category = catalog.categories.find((c) => c.slug === slug) || null;
  if (category) {
    return { category, convertedSub: null, catalog };
  }

  for (const cat of catalog.categories) {
    const sub = cat.subCategories.find((s) => s.slug === slug);
    if (sub) {
      return { category: null, convertedSub: sub, catalog };
    }
  }

  return { category: null, convertedSub: null, catalog };
}

/**
 * Pre-warms all client-side pages, catalog indices, site texts, brand assets,
 * ACRIO AI knowledge snapshot, and persisted AI responses into the 100MB Redis cache.
 */
export async function warmPublicCache(): Promise<void> {
  const [, , , , , , snapshot] = await Promise.all([
    getPublicSiteSettings(),
    getCachedUsefulLinks(),
    getSiteContentMap(),
    getFullCatalogIndex(),
    getCachedBrandAssets(),
    getAiRuntimeSettings(),
    getKnowledgeSnapshot(),
  ]);
  await hydrateAiResponsesIntoRedis(snapshot.catalogHash);
}

// Register automatic background warmer so every invalidation re-warms Redis proactively
registerCacheWarmHandler(warmPublicCache);
