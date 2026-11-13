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

const DOMAIN_SYNONYMS: Record<string, string[]> = {
  podium: [
    "podium",
    "lectern",
    "pulpit",
    "rostrum",
    "speech",
    "stage",
    "speaker",
    "auditorium",
    "conference",
    "seminar",
    "mic",
  ],
  hotel: [
    "hotel",
    "hospitality",
    "banquet",
    "resort",
    "reception",
    "convention",
    "menu",
    "tent",
    "podium",
    "signage",
  ],
  school: [
    "school",
    "college",
    "university",
    "education",
    "institute",
    "academy",
    "auditorium",
    "podium",
    "lectern",
    "notice",
    "trophy",
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
    "box",
  ],
  retail: [
    "retail",
    "shop",
    "showroom",
    "store",
    "display",
    "stand",
    "riser",
    "counter",
    "jewellery",
    "jewelry",
    "cosmetic",
    "holder",
    "rack",
  ],
  award: [
    "award",
    "trophy",
    "trophies",
    "memento",
    "plaque",
    "shield",
    "ceremony",
    "corporate",
    "gift",
    "recognition",
  ],
  office: [
    "office",
    "corporate",
    "signage",
    "nameplate",
    "brochure",
    "leaflet",
    "magazine",
    "holder",
    "box",
    "reception",
    "desk",
  ],
  box: [
    "box",
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
    "interior",
    "decor",
  ],
};

/**
 * Instant, zero-credit local synonym & intent matcher.
 * Powers <1ms search AND guarantees non-blocking customer UX from the 100MB Redis snapshot
 * even when AI cache misses or before AI credentials are added!
 */
export function localSmartProductMatch(
  snapshot: KnowledgeSnapshot,
  rawQuery: string,
  options?: { limit?: number; onlyPodiums?: boolean; categorySlug?: string }
): {
  products: CachedProductSummary[];
  matchedCategories: { name: string; slug: string; href: string }[];
  advisoryMessage: string;
} {
  const q = rawQuery.toLowerCase().trim();
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
      products: pool.slice(0, limit),
      matchedCategories: snapshot.categories.slice(0, 4).map((c) => ({
        name: c.name,
        slug: c.slug,
        href: `/shop/c/${c.slug}`,
      })),
      advisoryMessage:
        "Here are popular acrylic products made directly in our 16,000 sq. ft. factory. Tell us about your event, shop, office, or size needs and we will help you pick the right one!",
    };
  }

  const rawTokens = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  // Expand query with domain synonyms for vague queries
  const expandedTokens = new Set<string>(rawTokens);
  for (const token of rawTokens) {
    for (const [groupKey, words] of Object.entries(DOMAIN_SYNONYMS)) {
      if (words.some((w) => token.includes(w) || w.includes(token))) {
        expandedTokens.add(groupKey);
        words.slice(0, 4).forEach((w) => expandedTokens.add(w));
      }
    }
  }

  // Price ceiling detection e.g. "under 30000" or "below 25000"
  const priceLimitMatch = q.match(
    /(?:under|below|less than|max|budget)\s*(?:rs\.?|inr|₹)?\s*(\d{3,7})/i
  );
  const maxPrice = priceLimitMatch ? Number(priceLimitMatch[1]) : null;

  const scored = pool.map((p) => {
    let score = 0;
    const nameLower = p.name.toLowerCase();
    const skuLower = (p.sku || "").toLowerCase();

    if (nameLower === q || skuLower === q) score += 120;
    if (nameLower.includes(q)) score += 60;
    if (skuLower && skuLower.includes(q)) score += 80;

    for (const tok of rawTokens) {
      if (nameLower.includes(tok)) score += 25;
      if (skuLower.includes(tok)) score += 35;
      if (p.categoryName.toLowerCase().includes(tok)) score += 18;
      if (p.subCategoryName?.toLowerCase().includes(tok)) score += 20;
      if (p.searchBlob.includes(tok)) score += 10;
    }

    for (const syn of expandedTokens) {
      if (!rawTokens.includes(syn)) {
        if (nameLower.includes(syn)) score += 8;
        else if (p.searchBlob.includes(syn)) score += 4;
      }
    }

    if (maxPrice !== null) {
      if (p.effectivePrice && p.effectivePrice <= maxPrice) {
        score += 15;
      } else if (p.effectivePrice && p.effectivePrice > maxPrice) {
        score -= 20;
      }
    }

    return { product: p, score };
  });

  const matched = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit)
    .map((item) => item.product);

  const finalProducts = matched.length > 0 ? matched : pool.slice(0, Math.min(4, limit));

  const matchedCategories = snapshot.categories
    .filter((c) =>
      Array.from(expandedTokens).some((t) => c.name.toLowerCase().includes(t))
    )
    .slice(0, 3)
    .map((c) => ({ name: c.name, slug: c.slug, href: `/shop/c/${c.slug}` }));

  const advisoryMessage =
    matched.length > 0
      ? `Based on "${rawQuery}", here are our best matching acrylic products made in our 16,000 sq. ft. factory. Every item can also be custom-made with your logo, size, or LED light.`
      : `We custom-make clear acrylic products for "${rawQuery}"! Here are popular options from our catalog, or message our team on WhatsApp for custom sizes and logo printing.`;

  return {
    products: finalProducts,
    matchedCategories,
    advisoryMessage,
  };
}
