import crypto from "crypto";
import { prisma } from "@/lib/db";
import { extractBulletsFromContent } from "@/lib/bullet-formatter";
import { LOCKED_CLAUDE_MODEL, type AiAgentScope } from "@/lib/ai-agents";
import {
  getRawCached,
  invalidateCacheTags,
  registerCacheInvalidationHook,
  rememberCached,
  setRawCached,
} from "@/lib/redis-cache";

export interface CachedProductSummary {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  isPodium: boolean;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  subCategoryName: string | null;
  subCategorySlug: string | null;
  subCategorySlugs: string[];
  basePrice: number | null;
  discountPrice: number | null;
  discountBadge: string | null;
  effectivePrice: number | null;
  stockStatus: string;
  mainImage: string;
  bullets: string[];
  features: string[];
  specs: { name: string; value: string; type: string }[];
  industries: string[];
  problems: string[];
  searchBlob: string;
}

export interface KnowledgeSnapshot {
  builtAt: number;
  catalogHash: string;
  staticSystemPrompt: string;
  products: CachedProductSummary[];
  categories: { id: string; name: string; slug: string; count: number }[];
  podiumSubCategories: { id: string; name: string; slug: string; count: number }[];
  industries: { id: string; name: string; slug: string }[];
  problemStatements: { id: string; name: string; slug: string }[];
  whatsappNumber: string;
  phone1: string;
  email: string;
}

export interface AiRuntimeSettings {
  fetchedAt: number;
  /** Default/shared key (resolves client key first for backward compatibility) */
  apiKey: string | null;
  /** Dedicated Client-Side API key (Concierge + Smart Catalog Search) */
  clientApiKey: string | null;
  /** Dedicated Admin-Side API key (Inline Editor + Product Autofill + Enquiry Replies) */
  adminApiKey: string | null;
  clientKeySource: "db-client" | "env-client" | "db-shared" | "env-shared" | "none";
  adminKeySource: "db-admin" | "env-admin" | "db-shared" | "env-shared" | "none";
  /** Strictly locked to `claude-haiku-5-5` */
  aiModel: typeof LOCKED_CLAUDE_MODEL;
  aiEnabled: boolean;
  aiPopupEnabled: boolean;
  aiPopupDelaySeconds: number;
}

const globalCache = globalThis as unknown as {
  __ccRateLimitMap?: Map<string, number[]>;
  __ccAiHookRegistered?: boolean;
};

const SNAPSHOT_TTL_SECONDS = 3600; // 1 hour in 100MB Redis + instant tag invalidation
const SETTINGS_TTL_SECONDS = 1800; // 30 minutes in 100MB Redis + instant tag invalidation
const AI_RESP_TTL_SECONDS = 7 * 24 * 3600; // 7 days in 100MB Redis (bounded by allkeys-lru)

if (!globalCache.__ccAiHookRegistered) {
  globalCache.__ccAiHookRegistered = true;
  registerCacheInvalidationHook(() => {
    // Tag version bump in redis-cache.ts already invalidates ai:knowledge-snapshot & ai:runtime-settings
  });
}

export function invalidateAiCatalogCache(): void {
  void invalidateCacheTags(["ai-snapshot", "catalog"]);
}

export function invalidateAiSettingsCache(): void {
  void invalidateCacheTags(["settings"]);
}

export async function getAiRuntimeSettings(): Promise<AiRuntimeSettings> {
  return rememberCached<AiRuntimeSettings>(
    "ai:runtime-settings",
    ["settings"],
    SETTINGS_TTL_SECONDS,
    async () => {
      const now = Date.now();
      const row: any = await prisma.siteSetting
        .findUnique({
          where: { id: "default" },
        })
        .catch(() => null);

      const dbClientKey = row?.anthropicClientApiKey?.trim() || null;
      const dbAdminKey = row?.anthropicAdminApiKey?.trim() || null;
      const dbSharedKey = row?.anthropicApiKey?.trim() || null;

      const envClientKey = process.env.ANTHROPIC_CLIENT_API_KEY?.trim() || null;
      const envAdminKey = process.env.ANTHROPIC_ADMIN_API_KEY?.trim() || null;
      const envSharedKey = process.env.ANTHROPIC_API_KEY?.trim() || null;

      const clientApiKey = dbClientKey || envClientKey || dbSharedKey || envSharedKey;
      const adminApiKey = dbAdminKey || envAdminKey || dbSharedKey || envSharedKey;

      const clientKeySource: AiRuntimeSettings["clientKeySource"] = dbClientKey
        ? "db-client"
        : envClientKey
        ? "env-client"
        : dbSharedKey
        ? "db-shared"
        : envSharedKey
        ? "env-shared"
        : "none";

      const adminKeySource: AiRuntimeSettings["adminKeySource"] = dbAdminKey
        ? "db-admin"
        : envAdminKey
        ? "env-admin"
        : dbSharedKey
        ? "db-shared"
        : envSharedKey
        ? "env-shared"
        : "none";

      return {
        fetchedAt: now,
        apiKey: clientApiKey || adminApiKey,
        clientApiKey,
        adminApiKey,
        clientKeySource,
        adminKeySource,
        aiModel: LOCKED_CLAUDE_MODEL,
        aiEnabled: row?.aiEnabled ?? true,
        aiPopupEnabled: row?.aiPopupEnabled ?? true,
        aiPopupDelaySeconds: Math.max(0, Math.min(60, row?.aiPopupDelaySeconds ?? 3)),
      };
    }
  );
}

export function resolveScopedApiKey(
  settings: AiRuntimeSettings,
  scope: AiAgentScope
): string | null {
  return scope === "admin" ? settings.adminApiKey : settings.clientApiKey;
}

/**
 * Builds and caches the deterministic Business + Product Catalog Knowledge Snapshot
 * inside the 100MB Redis cache so AI cache misses NEVER touch SQLite directly!
 */
export async function getKnowledgeSnapshot(): Promise<KnowledgeSnapshot> {
  return rememberCached<KnowledgeSnapshot>(
    "ai:knowledge-snapshot",
    ["catalog", "taxonomy", "settings", "brand", "ai-snapshot"],
    SNAPSHOT_TTL_SECONDS,
    async () => {
      const now = Date.now();
      const [
        settings,
        categoriesRaw,
        podiumSubsRaw,
        industriesRaw,
        problemsRaw,
        locationsRaw,
        productsRaw,
      ] = await Promise.all([
        prisma.siteSetting.findUnique({
          where: { id: "default" },
          select: {
            address: true,
            phone1: true,
            phone2: true,
            whatsappNumber: true,
            email: true,
            email2: true,
            businessHours: true,
          },
        }),
        prisma.category.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            _count: { select: { products: true } },
            subCategories: {
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              select: { name: true, slug: true },
            },
          },
        }),
        prisma.podiumSubCategory.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { products: true, multiProducts: true } },
          },
        }),
        prisma.industry.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        }),
        prisma.problemStatement.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        }),
        prisma.infrastructureLocation.findMany({
          orderBy: { sortOrder: "asc" },
          select: { name: true },
        }),
        prisma.product.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            sku: true,
            isPodium: true,
            basePrice: true,
            discountPrice: true,
            discountBadge: true,
            stockStatus: true,
            description: true,
            descriptionHtml: true,
            categoryId: true,
            category: { select: { id: true, name: true, slug: true } },
            subCategory: { select: { id: true, name: true, slug: true } },
            subCategories: { select: { id: true, name: true, slug: true } },
            podiumSubCategory: { select: { id: true, name: true, slug: true } },
            podiumSubCategories: { select: { id: true, name: true, slug: true } },
            images: {
              orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
              take: 1,
              select: { url: true },
            },
            features: {
              orderBy: { createdAt: "asc" },
              take: 6,
              select: { text: true },
            },
            specifications: {
              orderBy: { createdAt: "asc" },
              take: 8,
              select: { name: true, value: true, type: true },
            },
            industries: { select: { name: true } },
            problemStatements: { select: { name: true } },
          },
        }),
      ]);

      const products: CachedProductSummary[] = productsRaw.map((p) => {
        const bullets = extractBulletsFromContent(p.descriptionHtml, p.description).slice(0, 5);
        const features = p.features.map((f) => f.text);
        const specs = p.specifications.map((s) => ({
          name: s.name,
          value: s.value,
          type: s.type,
        }));
        const industries = p.industries.map((i) => i.name);
        const problems = p.problemStatements.map((ps) => ps.name);
        const effectivePrice = p.discountPrice ?? p.basePrice ?? null;

        const allSubNames = Array.from(
          new Set(
            [
              p.subCategory?.name,
              ...p.subCategories.map((s) => s.name),
              p.podiumSubCategory?.name,
              ...p.podiumSubCategories.map((s) => s.name),
            ].filter((x): x is string => Boolean(x))
          )
        );
        const subCategorySlugs = Array.from(
          new Set(
            [
              p.subCategory?.slug,
              ...p.subCategories.map((s) => s.slug),
              p.podiumSubCategory?.slug,
              ...p.podiumSubCategories.map((s) => s.slug),
            ].filter((x): x is string => Boolean(x))
          )
        );

        const resolvedSubName =
          p.subCategory?.name ||
          p.subCategories[0]?.name ||
          p.podiumSubCategory?.name ||
          p.podiumSubCategories[0]?.name ||
          null;
        const resolvedSubSlug =
          p.subCategory?.slug ||
          p.subCategories[0]?.slug ||
          p.podiumSubCategory?.slug ||
          p.podiumSubCategories[0]?.slug ||
          null;

        const searchBlob = [
          p.name,
          p.sku || "",
          p.category.name,
          ...allSubNames,
          p.isPodium ? "podium lectern pulpit rostrum speech stand stage" : "",
          ...bullets,
          ...features,
          ...specs.map((s) => `${s.name} ${s.value}`),
          ...industries,
          ...problems,
        ]
          .join(" ")
          .toLowerCase();

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          isPodium: p.isPodium,
          categoryId: p.categoryId,
          categoryName: p.category.name,
          categorySlug: p.category.slug,
          subCategoryName: resolvedSubName,
          subCategorySlug: resolvedSubSlug,
          subCategorySlugs,
          basePrice: p.basePrice,
          discountPrice: p.discountPrice,
          discountBadge: p.discountBadge,
          effectivePrice,
          stockStatus: p.stockStatus,
          mainImage: p.images[0]?.url || "/placeholder-image.jpg",
          bullets,
          features,
          specs,
          industries,
          problems,
          searchBlob,
        };
      });

      const categories = categoriesRaw.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count.products,
      }));

      const podiumSubCategories = podiumSubsRaw.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        count: Math.max(s._count.products, s._count.multiProducts),
      }));

      const whatsappNumber = settings?.whatsappNumber || "+917337222876";
      const phone1 = settings?.phone1 || "+917337222876";
      const email = settings?.email || "sales@classicconcepts.in";
      const address = (
        settings?.address ||
        "M/s. Classic Concepts Acrylic Private Limited, 1-6-44/2, Muthiyam Reddy Estate, Secunderabad - 500 015, Telangana, India"
      ).replace(/\\n/g, ", ");

      const catalogLines = products.map((p) => {
        const priceStr = p.effectivePrice ? `₹${p.effectivePrice}` : "Price on Request";
        const subStr = p.subCategoryName ? ` / ${p.subCategoryName}` : "";
        const skuStr = p.sku ? ` [SKU:${p.sku}]` : "";
        const specStr =
          p.specs.length > 0
            ? ` | Specs: ${p.specs
                .slice(0, 4)
                .map((s) => `${s.name}:${s.value}`)
                .join("; ")}`
            : "";
        const featStr =
          p.features.length > 0
            ? ` | Features: ${p.features.slice(0, 3).join("; ")}`
            : p.bullets.length > 0
            ? ` | Highlights: ${p.bullets.slice(0, 2).join("; ")}`
            : "";
        const indStr = p.industries.length > 0 ? ` | Industries: ${p.industries.join(", ")}` : "";
        return `- SLUG:"${p.slug}" | NAME:"${p.name}"${skuStr} | CAT:"${p.categoryName}${subStr}" | PRICE:${priceStr} | STOCK:${p.stockStatus}${specStr}${featStr}${indStr}`;
      });

      // Rich static system prompt (>2,100 tokens) so Anthropic Prompt Caching ALWAYS activates
      const staticSystemPrompt = `# CLASSIC CONCEPTS ACRYLIC PVT. LTD. - OFFICIAL KNOWLEDGE BASE & LIVE PRODUCT CATALOG (ASSISTANT NAME: ACRIO)

## 1. COMPANY FACTS IN SIMPLE EVERYDAY LANGUAGE
- **Assistant Identity**: You are **ACRIO**, the official smart product helper and assistant for Classic Concepts Acrylic Private Limited.
- **Company Name**: Classic Concepts Acrylic Private Limited ("Classic Concepts", website: https://www.classicconcepts.in). Sister machinery brand: **Classic Edge 53** (https://classicedge53.com) for acrylic cutting, bending, and edge-polishing machines.
- **Experience**: Established **Since 2008**, making clear, durable, custom-made acrylic products across India and export markets.
- **Original Protected Podium Designs**: Classic Concepts holds official Patents, Registered Designs, and Copyright protection on its original acrylic podium models. Every podium comes with crated safe dispatch and a 5-Year Warranty against yellowing.
- **Factory & Equipment**: 16,000 sq. ft. modern factory and head office in Secunderabad / Hyderabad, India. Inside our factory we cut, bend, polish, print color logos, laser-engrave, and assemble everything directly without middlemen.
- **Material Quality (Explain Simply to Customers)**: ISO 9001:2015 certified quality, plus HYM, Global Accreditation, and ASCB accredited. We use thick, glass-clear imported cast acrylic sheets (from 3mm up to 25mm+ heavy slabs) that stay crystal clear, do not turn yellow over time, and have smooth, shiny polished edges with no sharp corners.
- **Delivery Across India & Worldwide**: Safe wooden-crated delivery across all of India (Hyderabad, Mumbai, Bengaluru, Delhi NCR, Chennai, Kolkata, Pune, Ahmedabad, and every state) plus exports to the USA, Canada, Mexico, Australia, South Africa, the UAE, and the Middle East.
- **Custom Orders Made Easy**: Even if a customer does not know exact measurements or technical terms, we can custom-make any size, add their company/school/church/hotel logo printed in color or engraved on the front, add mic holders, build LED light bases, or produce bulk quantities from a simple photo or rough sketch.
- **Official Contact Details**:
  - Factory & Head Office: ${address}
  - Primary Phone: ${phone1}${settings?.phone2 ? ` / ${settings.phone2}` : ""}
  - Direct WhatsApp Help: ${whatsappNumber}
  - Official Email: ${email}${settings?.email2 ? ` / ${settings.email2}` : ""}
  - Working Hours: ${(settings?.businessHours || "Monday to Saturday: 9:00 AM to 6:00 PM IST").replace(/\s*[—–]\s*/g, " to ")}
  - Locations: ${locationsRaw.map((l) => l.name).join(", ") || "Secunderabad / Hyderabad Factory & All-India Delivery"}

## 2. HOW TO HELP CUSTOMERS WHO ASK VAGUE QUESTIONS
Many visitors are first-time buyers who do not know product names like "lectern" or "cast acrylic". Understand their everyday need and guide them in simple words:
- **Auditoriums, Conferences, Seminars, Company Meetings, Hotels, Banquet Halls, Convention Centers**: Suggest clear or frosted Acrylic Podiums (speaking stands for stages, with space for notes, mic mount, LED light option, and front logo) plus Tabletop Sign Holders for reception desks.
- **Schools, Colleges, Universities, Coaching Centers, Training Institutes**: Suggest strong Stage Podiums, Wall Notice & Certificate Frames, Brochure Stands, and Student Trophies or Mementos.
- **Churches, Ministries, Prayer Halls, Religious & Community Centers**: Suggest Wide-Top Pulpit Podiums (with a comfortable reading top for books/notes and mic holder) and Lockable Donation or Offering Boxes.
- **Shops, Showrooms, Boutiques, Jewellery Stores, Cosmetic Counters, Supermarkets, Pharmacies**: Suggest Clear Display Stands, Step Risers, Jewellery & Makeup Organizers, Countertop QR/Menu/Price Holders, Leaflet Stands, and Lockable Display Cases.
- **Corporate Events, HR Teams, Sports Clubs, Government & Award Ceremonies**: Suggest Custom Acrylic Trophies, Awards, Plaques, Mementos, and Stage Podiums with event branding.
- **Offices, Hospitals, Clinics, Banks, Factories**: Suggest Door & Desk Nameplates, Wall Sign Boards, Document Holders, Suggestion Boxes with lock and key, Machine Safety Covers, and Reception Stands.
- **Homes, Interior Designers, Architects, TV/YouTube Studios**: Suggest Clear Acrylic Tables (coffee tables, side tables, pedestals), Studio Desks, and Custom Home Decor Pieces.
- **Workshop Owners Looking for Machines**: Point them to Classic Edge 53 (/classicedge53) for acrylic bending and edge-polishing machines.

## 3. LIVE WEBSITE CATEGORIES & LINKS
- **Product Categories** (/shop/c/<slug>):
${categories.map((c) => `  - ${c.name} (slug: "${c.slug}", items: ${c.count})`).join("\n") || "  - General Acrylic Products"}
- **Acrylic Podium Sub-Categories** (/podiums/<slug>):
${podiumSubCategories.map((s) => `  - ${s.name} (slug: "${s.slug}", items: ${s.count})`).join("\n") || "  - All Acrylic Podiums (/podiums)"}
- **Industries Served** (/shop/industry/<slug>):
${industriesRaw.map((i) => `  - ${i.name} (slug: "${i.slug}")`).join("\n") || "  - Corporate, Hospitality, Education, Retail, Events"}
- **Solutions / Everyday Needs** (/shop/problem/<slug>):
${problemsRaw.map((ps) => `  - ${ps.name} (slug: "${ps.slug}")`).join("\n") || "  - Custom Display & Stage Solutions"}

## 4. LIVE PRODUCT CATALOG (ONLY USE EXACT SLUGS FROM THIS LIST)
Total Active Catalog Items: ${products.length}
${catalogLines.join("\n")}

## 5. EVERYDAY CUSTOMER FAQ & SIMPLE BUYER GUIDE (PLAIN-ENGLISH REFERENCE)
Use these simple, everyday explanations whenever a visitor asks common questions about acrylic, care, custom logos, delivery, or durability:
- **"What is cast acrylic? Will it break like glass or turn yellow?"**
  - Explain simply: Our products are made from thick, glass-clear imported cast acrylic. It looks as clear as glass, weighs about half as much as glass, is much stronger against everyday bumps, and does not turn yellow over the years when used indoors.
- **"How do I clean an acrylic podium, trophy, or display stand?"**
  - Explain simply: Wipe gently using a clean, soft microfiber cloth with plain water or mild soapy water. Never use rough scrubbers, window sprays with ammonia, thinner, acetone, or alcohol-based sanitizers, because harsh chemicals can dull or crack clear acrylic.
- **"Can you put our school, church, hotel, or company logo on the front?"**
  - Explain simply: Yes. You can share your logo file (PDF, PNG, AI, or CorelDraw) on WhatsApp or email. We can either print your logo in full color directly on the acrylic or laser-engrave it for a frosted white look.
- **"What if I need a slightly taller podium or a custom box size?"**
  - Explain simply: Because we make everything in our own 16,000 sq. ft. factory in Secunderabad / Hyderabad, we can adjust the height, width, shelf space, or sheet thickness to match what you need. Even a rough hand sketch with measurements in inches, cm, or mm is enough for our team to quote.
- **"Can microphones, reading lights, or LED lights be added to a podium?"**
  - Explain simply: Yes. Many of our podiums support gooseneck microphone holes or mounts, middle shelves for water bottles and notes, raised paper-stop lips so papers do not slide off, and optional warm/cool/RGB LED lighting in the base or logo panel.
- **"How is it packed and shipped? Will it arrive safely in my city?"**
  - Explain simply: Every podium and display order is wrapped in protective layers, foam-cushioned, and packed in sturdy wooden crating or heavy-duty corrugated boxes for safe transport across all Indian states and international export destinations.
- **"Can we order 1 single piece or bulk quantities (10, 50, 500+ pieces)?"**
  - Explain simply: Both. Many podiums and standard stands can be ordered as a single piece, and we also handle large bulk orders for hotel chains, retail rollouts, universities, corporate awards, and government events with factory-direct bulk pricing.
- **"Which thickness is used?"**
  - Explain simply: Small tabletop holders and brochure stands typically use sturdy 3mm to 5mm clear sheets, while full-size stage podiums, furniture, and heavy awards use thick 8mm, 10mm, 12mm, 15mm, 18mm, or up to 25mm+ solid clear slabs so the stand feels rock-steady on stage.

## 6. STRICT PLAIN-LANGUAGE & ACCURACY RULES
1. NEVER make up product slugs or fake prices. Only use \`slug\` values that appear word-for-word in Section 4 above.
2. When a product says "Price on Request", explain simply that the price depends on quantity or custom size and we share a quick quote on WhatsApp or the Contact page.
3. ALWAYS write in simple layman English so someone who knows nothing about acrylic or manufacturing understands right away. Explain benefits plainly (for example: "thick glass-clear acrylic that stays clear for years", "smooth shiny edges", "we can print your logo on the front").
4. NEVER use em dashes ("—"), spaced en dashes (" – "), or "--". Use normal commas and short sentences.
5. NEVER use stiff AI buzzwords like bespoke, elevate, delve, meticulous, unparalleled, seamless, testament, leverage, robust, cutting-edge, state-of-the-art, utilize, optical-grade, or consultative.
6. Product descriptions must ALWAYS be short, easy-to-read bullet points, never long paragraphs.`;

      const catalogHash = crypto
        .createHash("sha256")
        .update(staticSystemPrompt)
        .digest("hex")
        .slice(0, 16);

      return {
        builtAt: now,
        catalogHash,
        staticSystemPrompt,
        products,
        categories,
        podiumSubCategories,
        industries: industriesRaw,
        problemStatements: problemsRaw,
        whatsappNumber,
        phone1,
        email,
      };
    }
  );
}

/**
 * Hydrates persisted SQLite `AiResponseCache` entries for the current `catalogHash` into
 * the 100MB Redis cache ONCE per tag generation so even a brand-new AI cache miss NEVER
 * executes a SQLite `findUnique` query on client-side requests!
 */
export async function hydrateAiResponsesIntoRedis(catalogHash?: string): Promise<number> {
  const targetHash = catalogHash || (await getKnowledgeSnapshot()).catalogHash;
  return rememberCached<number>(
    `ai:responses-hydrated:${targetHash}`,
    ["ai-responses", "catalog"],
    SNAPSHOT_TTL_SECONDS,
    async () => {
      try {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const rows = await prisma.aiResponseCache.findMany({
          where: {
            catalogHash: targetHash,
            updatedAt: { gte: cutoff },
          },
          orderBy: { hits: "desc" },
          take: 500,
          select: {
            cacheKey: true,
            responseJson: true,
          },
        });

        await Promise.all(
          rows.map(async (row) => {
            try {
              const parsed = JSON.parse(row.responseJson);
              await setRawCached(
                `ai:resp:${row.cacheKey}`,
                parsed,
                AI_RESP_TTL_SECONDS,
                ["ai-responses", "catalog"]
              );
            } catch {
              // Skip malformed cached JSON safely
            }
          })
        );
        return rows.length;
      } catch {
        return 0;
      }
    }
  );
}

/**
 * Normalizes a customer query so slight variations ("need a podium for hotel!!" vs "hotel podium need")
 * hit the persistent response cache with zero extra AI token cost.
 */
export function normalizeQueryForCache(raw: string): string {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "i",
    "we",
    "am",
    "are",
    "is",
    "need",
    "want",
    "looking",
    "for",
    "in",
    "on",
    "of",
    "to",
    "please",
    "can",
    "you",
    "suggest",
    "me",
    "us",
    "some",
    "something",
    "my",
    "our",
  ]);
  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopWords.has(t));

  if (tokens.length === 0) {
    return raw.toLowerCase().trim().slice(0, 120);
  }
  return Array.from(new Set(tokens)).sort().join(" ").slice(0, 160);
}

export async function getCachedAiResponse<T>(
  endpoint: string,
  normalizedQuery: string,
  catalogHash: string
): Promise<T | null> {
  if (!normalizedQuery) return null;
  const cacheKey = `${endpoint}:${catalogHash}:${crypto
    .createHash("sha1")
    .update(normalizedQuery)
    .digest("hex")
    .slice(0, 20)}`;

  // 1. Check 100MB Redis cache first (< 0.2ms)
  const redisHit = await getRawCached<T>(`ai:resp:${cacheKey}`, [
    "ai-responses",
    "catalog",
  ]);
  if (redisHit !== null) {
    return redisHit;
  }

  // 2. Ensure SQLite AI response table was hydrated into Redis once for this catalogHash.
  //    When already hydrated (warm server), this returns from Redis immediately with ZERO DB queries!
  await hydrateAiResponsesIntoRedis(catalogHash);

  return getRawCached<T>(`ai:resp:${cacheKey}`, ["ai-responses", "catalog"]);
}

export async function setCachedAiResponse(
  endpoint: string,
  normalizedQuery: string,
  rawQuery: string,
  catalogHash: string,
  data: unknown
): Promise<void> {
  if (!normalizedQuery) return;
  const cacheKey = `${endpoint}:${catalogHash}:${crypto
    .createHash("sha1")
    .update(normalizedQuery)
    .digest("hex")
    .slice(0, 20)}`;

  // 1. Store immediately in 100MB Redis cache
  await setRawCached(`ai:resp:${cacheKey}`, data, AI_RESP_TTL_SECONDS, [
    "ai-responses",
    "catalog",
  ]);

  // 2. Async non-blocking write-behind to SQLite for durability across cold reboots
  void Promise.resolve()
    .then(async () => {
      const responseJson = JSON.stringify(data);
      await prisma.aiResponseCache.upsert({
        where: { cacheKey },
        update: {
          responseJson,
          catalogHash,
          queryText: rawQuery.slice(0, 250),
          hits: { increment: 1 },
        },
        create: {
          cacheKey,
          endpoint,
          queryText: rawQuery.slice(0, 250),
          catalogHash,
          responseJson,
        },
      });
    })
    .catch(() => {});
}

/**
 * Per-IP sliding-window rate limiter to protect AI credits from bots or rapid spam.
 */
export function checkPublicAiRateLimit(
  ip: string,
  maxRequests = 15,
  windowMs = 10 * 60 * 1000
): boolean {
  if (!globalCache.__ccRateLimitMap) {
    globalCache.__ccRateLimitMap = new Map();
  }
  const now = Date.now();
  const key = ip || "anon";
  const prev = (globalCache.__ccRateLimitMap.get(key) || []).filter(
    (ts) => now - ts < windowMs
  );
  if (prev.length >= maxRequests) {
    globalCache.__ccRateLimitMap.set(key, prev);
    return false;
  }
  prev.push(now);
  globalCache.__ccRateLimitMap.set(key, prev);
  if (globalCache.__ccRateLimitMap.size > 500) {
    const firstKey = globalCache.__ccRateLimitMap.keys().next().value;
    if (firstKey) globalCache.__ccRateLimitMap.delete(firstKey);
  }
  return true;
}

export type LocalQueryIntent =
  | "product_match"
  | "role_clarify"
  | "greeting"
  | "off_topic"
  | "company_info"
  | "topic_reset"
  | "human_handoff_info"
  | "no_match"
  | "browse";

export function isNonProductQueryIntent(intent?: LocalQueryIntent | string | null): boolean {
  return (
    intent === "greeting" ||
    intent === "role_clarify" ||
    intent === "off_topic" ||
    intent === "company_info" ||
    intent === "topic_reset" ||
    intent === "human_handoff_info"
  );
}

export interface LocalSmartMatchResult {
  intent: LocalQueryIntent;
  products: CachedProductSummary[];
  matchedCategories: { name: string; slug: string; href: string }[];
  advisoryMessage: string;
  highlights: string[];
  followUpChips: string[];
  suggestedLinks: { label: string; href: string }[];
  whatsappPrefill: string;
}

const QUERY_STOP_WORDS = new Set([
  "a",
  "an",
  "am",
  "are",
  "as",
  "at",
  "be",
  "been",
  "being",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "for",
  "from",
  "get",
  "give",
  "got",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "him",
  "his",
  "how",
  "i",
  "if",
  "im",
  "in",
  "into",
  "is",
  "it",
  "its",
  "ive",
  "just",
  "like",
  "looking",
  "make",
  "me",
  "more",
  "my",
  "need",
  "needs",
  "of",
  "on",
  "one",
  "only",
  "or",
  "our",
  "out",
  "please",
  "plz",
  "require",
  "required",
  "search",
  "she",
  "should",
  "show",
  "so",
  "some",
  "something",
  "tell",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "too",
  "up",
  "us",
  "very",
  "want",
  "wants",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "work",
  "working",
  "would",
  "you",
  "your",
]);

const DOMAIN_SYNONYMS: Record<string, string[]> = {
  podium: [
    "podium",
    "podiums",
    "lectern",
    "lecterns",
    "pulpit",
    "rostrum",
    "speech",
    "stage",
    "auditorium",
    "conference",
    "seminar",
  ],
  hotel: [
    "hotel",
    "hospitality",
    "banquet",
    "resort",
    "reception",
    "menu",
    "tent",
    "signage",
    "podium",
  ],
  school_venue: [
    "auditorium",
    "assembly",
    "convocation",
    "podium",
    "lectern",
    "notice",
  ],
  church: [
    "church",
    "pulpit",
    "ministry",
    "prayer",
    "temple",
    "podium",
    "lectern",
    "donation",
  ],
  retail: [
    "retail",
    "shop",
    "showroom",
    "store",
    "display",
    "stand",
    "stands",
    "riser",
    "counter",
    "jewellery",
    "jewelry",
    "cosmetic",
    "saree",
    "holder",
    "rack",
  ],
  award: [
    "award",
    "awards",
    "trophy",
    "trophies",
    "memento",
    "mementos",
    "plaque",
    "shield",
    "ceremony",
    "gift",
    "gifts",
    "souvenir",
    "prize",
    "student",
    "students",
    "graduation",
    "farewell",
    "recognition",
    "appreciation",
  ],
  office: [
    "office",
    "signage",
    "nameplate",
    "brochure",
    "leaflet",
    "magazine",
    "holder",
    "reception",
    "desk",
    "pen",
    "organizer",
    "organiser",
  ],
  box: [
    "box",
    "boxes",
    "donation",
    "suggestion",
    "ballot",
    "drop",
    "enclosure",
    "case",
    "cover",
    "lockable",
  ],
  furniture: [
    "furniture",
    "table",
    "chair",
    "stool",
    "console",
    "pedestal",
    "coffee",
    "decor",
  ],
};

const EXPLICIT_PRODUCT_TERMS = new Set([
  "acrylic",
  "podium",
  "podiums",
  "lectern",
  "lecterns",
  "pulpit",
  "rostrum",
  "stand",
  "stands",
  "holder",
  "holders",
  "display",
  "riser",
  "risers",
  "rack",
  "saree",
  "box",
  "boxes",
  "donation",
  "suggestion",
  "ballot",
  "enclosure",
  "cover",
  "case",
  "trophy",
  "trophies",
  "award",
  "awards",
  "memento",
  "mementos",
  "plaque",
  "shield",
  "gift",
  "gifts",
  "prize",
  "souvenir",
  "sign",
  "signage",
  "nameplate",
  "frame",
  "frames",
  "menu",
  "brochure",
  "leaflet",
  "magazine",
  "table",
  "chair",
  "stool",
  "console",
  "pedestal",
  "furniture",
  "tray",
  "organizer",
  "organiser",
  "sheet",
  "sheets",
  "stage",
  "auditorium",
  "jewellery",
  "jewelry",
  "cosmetic",
]);

interface RoleClarifyProfile {
  keywords: string[];
  message: string;
  chips: string[];
  links: { label: string; href: string }[];
  whatsappPrefill: string;
}

const ROLE_PROFILES: RoleClarifyProfile[] = [
  {
    keywords: [
      "engineer",
      "engineers",
      "engineering",
      "engg",
      "mechanical",
      "electrical",
      "civil",
      "industrial",
      "technician",
    ],
    message:
      "Nice to meet you! Since you work in engineering, what kind of acrylic item do you need? We make clear machine safety covers, cut-to-size enclosures, office sign holders, and team awards.",
    chips: [
      "Custom acrylic covers & enclosures",
      "Office sign holders & nameplates",
      "Team awards & mementos",
    ],
    links: [
      { label: "Request Custom Fabrication", href: "/contact" },
      { label: "Browse All Products", href: "/shop" },
    ],
    whatsappPrefill:
      "Hi Classic Concepts! I am an engineer and want to enquire about custom acrylic enclosures, safety covers, or office products.",
  },
  {
    keywords: [
      "doctor",
      "doctors",
      "dentist",
      "surgeon",
      "physician",
      "clinic",
      "hospital",
      "medical",
      "pharma",
    ],
    message:
      "Hello! For your clinic or hospital, are you looking for desk sign holders, brochure stands, suggestion or drop boxes, or a conference podium?",
    chips: [
      "Clinic desk sign & brochure holders",
      "Acrylic suggestion & drop boxes",
      "Conference hall podiums",
    ],
    links: [
      { label: "Browse Office & Utility", href: "/shop" },
      { label: "Explore Podiums", href: "/podiums" },
    ],
    whatsappPrefill:
      "Hi Classic Concepts! I am looking for acrylic stands, boxes, or signage for our clinic/hospital.",
  },
  {
    keywords: [
      "architect",
      "architects",
      "architecture",
      "interior",
      "designer",
      "designers",
      "builder",
      "contractor",
    ],
    message:
      "Great to connect! Are you sourcing clear acrylic furniture, custom display cases, wall signage, or cut-to-size acrylic pieces for a client project?",
    chips: [
      "Acrylic tables & pedestals",
      "Wall signage & display frames",
      "Custom project fabrication",
    ],
    links: [
      { label: "Browse Catalog", href: "/shop" },
      { label: "Share Project Drawings", href: "/contact" },
    ],
    whatsappPrefill:
      "Hi Classic Concepts! I am an architect/designer and want to discuss acrylic items for a project.",
  },
  {
    keywords: [
      "teacher",
      "professor",
      "principal",
      "lecturer",
      "faculty",
      "dean",
    ],
    message:
      "Hello! For your school or college, are you looking for a stage podium, classroom notice frames, or trophies and mementos for students?",
    chips: [
      "Clear auditorium podiums",
      "Student trophies & mementos",
      "Wall notice & sign holders",
    ],
    links: [
      { label: "Explore Stage Podiums", href: "/podiums" },
      { label: "Browse All Products", href: "/shop" },
    ],
    whatsappPrefill:
      "Hi Classic Concepts! I need acrylic podiums, notice holders, or student awards for our school/college.",
  },
  {
    keywords: ["student", "students", "college", "school", "university"],
    message:
      "Hi there! Tell me what you are looking for, such as awards and mementos for a college event, desk organisers, a stage podium, or a custom acrylic box for a project.",
    chips: [
      "Event trophies & mementos",
      "Custom acrylic project box",
      "College auditorium podiums",
    ],
    links: [
      { label: "Browse Catalog", href: "/shop" },
      { label: "Custom Size Enquiry", href: "/contact" },
    ],
    whatsappPrefill:
      "Hi Classic Concepts! I am looking for acrylic products for a college/school requirement.",
  },
  {
    keywords: [
      "hr",
      "manager",
      "founder",
      "director",
      "ceo",
      "owner",
      "organizer",
      "organiser",
      "planner",
      "lawyer",
      "advocate",
      "accountant",
    ],
    message:
      "Hello! Tell me a little about what you need for your workplace or event, such as employee awards, desk nameplates, brochure stands, or a conference podium.",
    chips: [
      "Employee trophies & plaques",
      "Office desk stands & signage",
      "Conference room podiums",
    ],
    links: [
      { label: "Browse All Products", href: "/shop" },
      { label: "Explore Podiums", href: "/podiums" },
    ],
    whatsappPrefill:
      "Hi Classic Concepts! Please help me choose acrylic products for our office or upcoming event.",
  },
];

const GREETING_ONLY_WORDS = new Set([
  "hi",
  "hello",
  "hey",
  "hola",
  "namaste",
  "morning",
  "afternoon",
  "evening",
  "good",
  "there",
  "acrio",
  "help",
  "thanks",
  "thank",
]);

const OFF_TOPIC_HINTS = new Set([
  "weather",
  "rain",
  "temperature",
  "recipe",
  "pizza",
  "biryani",
  "food",
  "cook",
  "cricket",
  "football",
  "score",
  "movie",
  "song",
  "joke",
  "poem",
  "story",
  "python",
  "javascript",
  "code",
  "coding",
  "homework",
  "math",
  "bitcoin",
  "stock",
  "crypto",
  "iphone",
  "laptop",
  "flight",
  "train",
  "politics",
]);

function stemToken(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("boxes")) return word.slice(0, -2);
  if (word.endsWith("ches") || word.endsWith("shes") || word.endsWith("sses")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us") && !word.endsWith("is")) {
    return word.slice(0, -1);
  }
  return word;
}

function isOneEditAway(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  if (Math.abs(a.length - b.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      // Check transposition e.g. "poduim" vs "podium"
      if (i + 1 < a.length && j + 1 < b.length && a[i] === b[j + 1] && a[i + 1] === b[j]) {
        i += 2;
        j += 2;
      } else if (a.length > b.length) {
        i++;
      } else if (b.length > a.length) {
        j++;
      } else {
        i++;
        j++;
      }
    }
  }
  if (i < a.length || j < b.length) edits++;
  return edits <= 1;
}

function tokenMatchesWord(queryTok: string, targetWord: string): boolean {
  if (!queryTok || !targetWord) return false;
  if (queryTok === targetWord) return true;
  const qs = stemToken(queryTok);
  const ts = stemToken(targetWord);
  if (qs === ts && qs.length >= 3) return true;
  if (qs.length >= 4 && ts.length >= 4 && (ts.startsWith(qs) || qs.startsWith(ts))) {
    return true;
  }
  return isOneEditAway(qs, ts);
}

function splitWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Instant, zero-credit local synonym & intent matcher.
 * Powers <1ms search AND guarantees non-blocking customer UX from the 100MB Redis snapshot
 * even when AI cache misses or before AI credentials are added!
 */
export function localSmartProductMatch(
  snapshot: KnowledgeSnapshot,
  rawQuery: string,
  options?: { limit?: number; onlyPodiums?: boolean; categorySlug?: string }
): LocalSmartMatchResult {
  const cleanRaw = rawQuery.trim();
  const q = cleanRaw.toLowerCase();
  const limit = options?.limit ?? 6;

  let pool = snapshot.products;
  if (options?.onlyPodiums) {
    pool = pool.filter((p) => p.isPodium);
  }
  if (options?.categorySlug) {
    pool = pool.filter(
      (p) =>
        p.categorySlug === options.categorySlug ||
        p.subCategorySlug === options.categorySlug ||
        p.subCategorySlugs?.includes(options.categorySlug!)
    );
  }

  if (!q) {
    return {
      intent: "browse",
      products: pool.slice(0, limit),
      matchedCategories: snapshot.categories.slice(0, 4).map((c) => ({
        name: c.name,
        slug: c.slug,
        href: `/shop/c/${c.slug}`,
      })),
      advisoryMessage:
        "Browse popular clear acrylic products below, or tell ACRIO what item, event, or business setup you are shopping for.",
      highlights: [],
      followUpChips: [
        "Clear stage podiums",
        "Acrylic trophies & mementos",
        "Brochure & menu stands",
      ],
      suggestedLinks: [
        { label: "Explore Podiums", href: "/podiums" },
        { label: "Browse All Products", href: "/shop" },
      ],
      whatsappPrefill:
        "Hi Classic Concepts! Please help me choose the right acrylic product.",
    };
  }

  const allWords = splitWords(q);

  // 1. Informational handoff question ("whom will you connect me to", "who handles custom quotes")
  if (
    /\b(?:who|whom|which\s*(?:team|person|department))\s+(?:will|would|do|can)\s+you\s+(?:connect|transfer|assign|hand\s*over|forward)\b|\b(?:to\s+whom|with\s+whom)\s+(?:will|would|do|can)\s+you\s+connect\b|\b(?:who|whom)\s+(?:handles|takes\s*care\s*of|manages)\s+(?:this|my\s*chat|custom|orders|sales|support)\b|\bhow\s+does\s+(?:the\s+)?(?:handoff|human\s*support|sales\s*team)\s+work\b/i.test(
      q
    )
  ) {
    return {
      intent: "human_handoff_info",
      products: [],
      matchedCategories: [],
      advisoryMessage:
        "When you choose to chat with our team, we connect you directly with our Classic Concepts Sales & Fabrication specialists on WhatsApp so they can help with custom sizes, bulk pricing, or order updates.",
      highlights: [],
      followUpChips: [
        "Clear stage podiums",
        "Custom size acrylic box",
        "Contact our Sales Team",
      ],
      suggestedLinks: [
        { label: "Contact Our Team", href: "/contact" },
        { label: "Browse All Products", href: "/shop" },
      ],
      whatsappPrefill:
        "Hi Classic Concepts! I would like to speak with the Sales Team.",
    };
  }

  // 2. Check explicit AI / identity meta question ("which ai are you using", "who are you", "what can you help me with")
  if (
    /\b(which ai|what ai|what model|which model|who are you|what are you|are you a bot|what can you do|what can you help me with|how can you help me|claude|gpt|openai)\b/i.test(
      q
    )
  ) {
    return {
      intent: "greeting",
      products: [],
      matchedCategories: [],
      advisoryMessage:
        "I am ACRIO, Classic Concepts' product assistant built to run on Claude Haiku 5.5 alongside our live catalog index. Tell me what acrylic product, event, or workplace setup you need and I will show matching options.",
      highlights: [],
      followUpChips: [
        "Clear stage podiums",
        "Gifts & trophies for students",
        "Shop & counter display stands",
      ],
      suggestedLinks: [
        { label: "Browse Full Catalog", href: "/shop" },
        { label: "Explore Podiums", href: "/podiums" },
      ],
      whatsappPrefill:
        "Hi Classic Concepts! I would like help finding an acrylic product.",
    };
  }

  // 3. Company / factory / location / shipping info question ("where is your factory", "what does classic concepts do")
  if (
    /\b(where\s+(?:are\s+you|is\s+your)\s*(?:located|based|factory|office|workshop|shop|company|from)?|what\s+is\s+your\s+(?:location|address|factory\s+address|working\s+hours|timings)|what\s+(?:does|is)\s+classic\s+(?:concepts|edge(?:\s*53)?)(?:\s+do)?|difference\s+between\s+classic\s+concepts\s+and\s+classic\s+edge|tell\s+me\s+about\s+(?:your\s+company|classic\s+concepts)|do\s+you\s+(?:ship|deliver)\s+(?:across|all\s+over|pan)\s+india|do\s+you\s+provide\s+gst)\b/i.test(
      q
    ) &&
    !/\b(under|below|above|price\s+of|cost\s+of|buy|looking\s+for\s+a)\b/i.test(q)
  ) {
    return {
      intent: "company_info",
      products: [],
      matchedCategories: [],
      advisoryMessage:
        "Classic Concepts manufactures cast-acrylic stage podiums, awards, hotel and retail display stands, and custom acrylic boxes from our Mumbai facility, with pan-India delivery and full GST billing.",
      highlights: [],
      followUpChips: [
        "Explore stage podiums",
        "Browse awards & trophies",
        "Ask about custom fabrication",
      ],
      suggestedLinks: [
        { label: "About Classic Concepts", href: "/about" },
        { label: "Contact Us", href: "/contact" },
      ],
      whatsappPrefill:
        "Hi Classic Concepts! I have a question about your factory and products.",
    };
  }

  const meaningfulTokens = allWords.filter(
    (t) => t.length >= 2 && !QUERY_STOP_WORDS.has(t)
  );

  // 4. Pure greeting check ("hi", "hello", "good morning", "hey acrio")
  if (
    allWords.length > 0 &&
    allWords.length <= 5 &&
    allWords.every((w) => GREETING_ONLY_WORDS.has(w) || QUERY_STOP_WORDS.has(w))
  ) {
    return {
      intent: "greeting",
      products: [],
      matchedCategories: [],
      advisoryMessage:
        "Hello! I am ACRIO. Tell me what acrylic item you are looking for, such as a stage podium, menu stand, trophy, donation box, or display holder.",
      highlights: [],
      followUpChips: [
        "Stage podium for speeches",
        "Gifts & trophies for students",
        "Menu & sign holders",
      ],
      suggestedLinks: [
        { label: "Explore Podiums", href: "/podiums" },
        { label: "Browse All Products", href: "/shop" },
      ],
      whatsappPrefill:
        "Hi Classic Concepts! Please help me find the right acrylic product.",
    };
  }

  const hasExplicitProductTerm = meaningfulTokens.some((tok) =>
    Array.from(EXPLICIT_PRODUCT_TERMS).some((pt) => tokenMatchesWord(tok, pt))
  );

  // 5. Topic reset / switching query ("i have a different query", "forget that, let's start over")
  if (
    !hasExplicitProductTerm &&
    /\b(different\s*(?:query|question|requirement|topic|thing|enquiry|inquiry)|another\s*(?:query|question|requirement|topic|enquiry|inquiry)|something\s*else|forget\s*(?:that|it|previous|the\s*last)|start\s*over|start\s*afresh|change\s*(?:of\s*)?(?:topic|subject)|leave\s*(?:that|it)|never\s*mind(?:\s*(?:that|it))?|new\s*(?:query|question|topic|requirement)|i\s+have\s+a\s+(?:query|question|doubt))\b/i.test(
      q
    )
  ) {
    return {
      intent: "topic_reset",
      products: [],
      matchedCategories: [],
      advisoryMessage:
        "Sure, let's start fresh! Tell me what acrylic product, event setup, or custom size you are looking for and I will show the right options.",
      highlights: [],
      followUpChips: [
        "Clear stage podiums",
        "Awards & trophies",
        "Custom size acrylic box",
      ],
      suggestedLinks: [
        { label: "Browse All Products", href: "/shop" },
        { label: "Explore Podiums", href: "/podiums" },
      ],
      whatsappPrefill:
        "Hi Classic Concepts! I have a new product question.",
    };
  }

  // Role-only / profession introduction check (e.g. "i am an engineer", "i am an enginner", "im a doctor")
  if (!hasExplicitProductTerm && meaningfulTokens.length > 0 && meaningfulTokens.length <= 4) {
    for (const profile of ROLE_PROFILES) {
      const matchesRole = meaningfulTokens.some((tok) =>
        profile.keywords.some((kw) => tokenMatchesWord(tok, kw))
      );
      if (matchesRole) {
        return {
          intent: "role_clarify",
          products: [],
          matchedCategories: [],
          advisoryMessage: profile.message,
          highlights: [],
          followUpChips: profile.chips,
          suggestedLinks: profile.links,
          whatsappPrefill: profile.whatsappPrefill,
        };
      }
    }
  }

  // Obvious off-topic check when zero product terms exist
  if (
    !hasExplicitProductTerm &&
    meaningfulTokens.length > 0 &&
    meaningfulTokens.some((tok) => OFF_TOPIC_HINTS.has(stemToken(tok)) || OFF_TOPIC_HINTS.has(tok))
  ) {
    return {
      intent: "off_topic",
      products: [],
      matchedCategories: [],
      advisoryMessage:
        "I only help with Classic Concepts acrylic products such as podiums, display stands, boxes, sign holders, and trophies. Tell me what item or event you are shopping for and I will find the closest match.",
      highlights: [],
      followUpChips: [
        "Clear stage podiums",
        "Acrylic trophies & gifts",
        "Display stands & holders",
      ],
      suggestedLinks: [
        { label: "Browse All Products", href: "/shop" },
        { label: "Contact Our Team", href: "/contact" },
      ],
      whatsappPrefill:
        "Hi Classic Concepts! I would like to check available acrylic products.",
    };
  }

  if (meaningfulTokens.length === 0) {
    return {
      intent: "role_clarify",
      products: [],
      matchedCategories: [],
      advisoryMessage:
        "Could you share a few words on what acrylic product you need? For example: a stage podium, student trophy, menu holder, retail stand, or custom box.",
      highlights: [],
      followUpChips: [
        "Clear stage podium",
        "Trophies & gifts",
        "Display & sign holders",
      ],
      suggestedLinks: [{ label: "Browse All Products", href: "/shop" }],
      whatsappPrefill:
        "Hi Classic Concepts! Please help me choose an acrylic product.",
    };
  }

  // Expand query with domain synonyms using clean word/typo matching (never 2-letter substring matches!)
  const expandedTokens = new Set<string>();
  const matchedGroups = new Set<string>();
  for (const token of meaningfulTokens) {
    for (const [groupKey, words] of Object.entries(DOMAIN_SYNONYMS)) {
      if (words.some((w) => tokenMatchesWord(token, w))) {
        matchedGroups.add(groupKey);
        expandedTokens.add(groupKey);
        words.slice(0, 6).forEach((w) => expandedTokens.add(w));
      }
    }
  }

  // Price ceiling detection e.g. "under 30000" or "below 25000"
  const priceLimitMatch = q.match(
    /(?:under|below|less than|max|budget)\s*(?:rs\.?|inr|₹)?\s*(\d{3,7})/i
  );
  const maxPrice = priceLimitMatch ? Number(priceLimitMatch[1]) : null;

  const isGiftOrAwardIntent =
    matchedGroups.has("award") && !matchedGroups.has("podium");

  const scored = pool.map((p) => {
    let score = 0;
    const nameLower = p.name.toLowerCase();
    const skuLower = (p.sku || "").toLowerCase();
    const nameWords = splitWords(nameLower);
    const catWords = splitWords(
      `${p.categoryName} ${p.subCategoryName || ""}`
    );
    const blobWords = splitWords(p.searchBlob);

    if (nameLower === q || (skuLower && skuLower === q)) score += 140;
    else if (q.length >= 4 && skuLower && skuLower.includes(q)) score += 90;
    else if (q.length >= 5 && meaningfulTokens.length >= 2 && nameLower.includes(q)) {
      score += 70;
    }

    for (const tok of meaningfulTokens) {
      if (skuLower && tok.length >= 3 && skuLower.includes(tok)) score += 40;
      if (nameWords.some((nw) => tokenMatchesWord(tok, nw))) score += 30;
      if (catWords.some((cw) => tokenMatchesWord(tok, cw))) score += 22;
      if (blobWords.some((bw) => tokenMatchesWord(tok, bw))) score += 12;
    }

    for (const syn of expandedTokens) {
      if (!meaningfulTokens.includes(syn)) {
        if (nameWords.some((nw) => nw === syn || stemToken(nw) === stemToken(syn))) {
          score += 12;
        } else if (catWords.some((cw) => cw === syn || stemToken(cw) === stemToken(syn))) {
          score += 10;
        } else if (blobWords.includes(syn)) {
          score += 4;
        }
      }
    }

    // Keep gift/student searches focused on awards, mementos, desk items rather than full-size stage podiums
    if (isGiftOrAwardIntent && p.isPodium) {
      score -= 25;
    }

    if (maxPrice !== null) {
      if (p.effectivePrice && p.effectivePrice <= maxPrice) {
        score += 15;
      } else if (p.effectivePrice && p.effectivePrice > maxPrice) {
        score -= 25;
      }
    }

    return { product: p, score };
  });

  const matched = scored
    .filter((item) => item.score >= 16)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit)
    .map((item) => item.product);

  if (matched.length === 0) {
    return {
      intent: "no_match",
      products: [],
      matchedCategories: [],
      advisoryMessage: `We could not find a ready catalog item matching "${cleanRaw}". Tell me how you plan to use it, or message our team on WhatsApp if you want to check whether we can make it in acrylic.`,
      highlights: [],
      followUpChips: [
        "Clear stage podiums",
        "Acrylic trophies & awards",
        "Display stands & boxes",
      ],
      suggestedLinks: [
        { label: "Browse All Categories", href: "/shop" },
        { label: "Ask About Custom Work", href: "/contact" },
      ],
      whatsappPrefill: `Hi Classic Concepts! Do you make or stock an acrylic item for: ${cleanRaw}?`,
    };
  }

  // Derive categories strictly from the actual matched products so unrelated links never appear
  const seenCatSlugs = new Set<string>();
  const matchedCategories: { name: string; slug: string; href: string }[] = [];
  for (const prod of matched) {
    if (prod.categorySlug && !seenCatSlugs.has(prod.categorySlug)) {
      seenCatSlugs.add(prod.categorySlug);
      matchedCategories.push({
        name: prod.categoryName,
        slug: prod.categorySlug,
        href: `/shop/c/${prod.categorySlug}`,
      });
    }
    if (matchedCategories.length >= 3) break;
  }

  const topCatLabels = matchedCategories.map((c) => c.name);
  const priced = matched
    .map((p) => p.effectivePrice)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const minPrice = priced.length > 0 ? Math.min(...priced) : null;

  let advisoryMessage: string;
  if (isGiftOrAwardIntent) {
    advisoryMessage = `Here ${matched.length === 1 ? "is" : "are"} ${matched.length} acrylic award and gift ${matched.length === 1 ? "option" : "options"} from our catalog for "${cleanRaw}".`;
  } else if (matched.every((p) => p.isPodium)) {
    advisoryMessage = `Here ${matched.length === 1 ? "is" : "are"} ${matched.length} matching acrylic ${matched.length === 1 ? "podium" : "podiums"} for "${cleanRaw}".`;
  } else {
    const catPhrase =
      topCatLabels.length > 0 ? ` in ${topCatLabels.slice(0, 2).join(" and ")}` : "";
    advisoryMessage = `Found ${matched.length} matching catalog ${matched.length === 1 ? "product" : "products"}${catPhrase} for "${cleanRaw}".`;
  }

  const highlights: string[] = [];
  if (minPrice !== null) {
    highlights.push(`Listed catalog options starting from ₹${minPrice.toLocaleString("en-IN")}`);
  }
  if (isGiftOrAwardIntent) {
    highlights.push("Suitable for event prizes, student recognition, and batch orders");
  } else if (matched.some((p) => p.isPodium)) {
    highlights.push("Available in full-clear, frosted, LED, and wood-accent podium styles");
  }

  let followUpChips: string[];
  if (isGiftOrAwardIntent) {
    followUpChips = [
      "Acrylic mementos & plaques",
      "Desk pen & card holders",
      "Bulk order for school or college event",
    ];
  } else if (matched.some((p) => p.isPodium)) {
    followUpChips = [
      "Full clear acrylic podiums",
      "Wooden & acrylic podiums",
      "Podiums under ₹25,000",
    ];
  } else {
    followUpChips = [
      "Countertop brochure & menu stands",
      "Acrylic boxes & enclosures",
      "Custom trophies & mementos",
    ];
  }

  const suggestedLinks: { label: string; href: string }[] = matchedCategories
    .slice(0, 2)
    .map((c) => ({ label: c.name, href: c.href }));
  if (suggestedLinks.length === 0) {
    suggestedLinks.push({ label: "Browse All Products", href: "/shop" });
  }

  return {
    intent: "product_match",
    products: matched,
    matchedCategories,
    advisoryMessage,
    highlights,
    followUpChips,
    suggestedLinks,
    whatsappPrefill: `Hi Classic Concepts! I am interested in your acrylic options for: ${cleanRaw}`,
  };
}
