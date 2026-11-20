import crypto from "crypto";
import { prisma } from "@/lib/db";
import { extractBulletsFromContent } from "@/lib/bullet-formatter";
import {
  getAgentDefinition,
  LOCKED_CLAUDE_MODEL,
  type AiAgentScope,
} from "@/lib/ai-agents";
import { resolveVerifiedGoogleMapsData } from "@/lib/location-helper";
import {
  getRawCached,
  invalidateCacheTags,
  registerCacheInvalidationHook,
  rememberCached,
  setRawCached,
} from "@/lib/redis-cache";
import type { LocalQueryIntent } from "./helpers.acro.ai";

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
  address: string;
  mapsUrl: string;
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
    "ai:knowledge-snapshot:v7",
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
        teamMembersRaw,
        machineryRaw,
        resourcesRaw,
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
            mapEmbedUrl: true,
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
          select: { name: true, mapUrl: true },
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
              take: 20,
              select: { text: true },
            },
            specifications: {
              orderBy: { createdAt: "asc" },
              take: 25,
              select: { name: true, value: true, type: true },
            },
            industries: { select: { name: true } },
            problemStatements: { select: { name: true } },
          },
        }),
        prisma.teamMember
          .findMany({
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          })
          .catch(() => []),
        prisma.machinery
          .findMany({
            orderBy: { sortOrder: "asc" },
          })
          .catch(() => []),
        prisma.resource
          .findMany({
            orderBy: { sortOrder: "asc" },
          })
          .catch(() => []),
      ]);

      const products: CachedProductSummary[] = productsRaw
        .filter((p) => {
          const cleanId = String(p.id || "").trim().toLowerCase();
          const cleanName = String(p.name || "").trim().toLowerCase();
          if (!cleanName || cleanId === "test" || cleanName === "test" || /^test\s+product\b/i.test(cleanName)) {
            return false;
          }
          return true;
        })
        .map((p) => {
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

        const normalizedSku = p.sku
          ? p.sku.replace(/^CCPO(\d+)/i, "CCP0$1")
          : null;

        const searchBlob = [
          p.name,
          normalizedSku || "",
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
          sku: normalizedSku,
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

      const whatsappNumber = "+91 73372 20568";
      const phone1 =
        settings?.phone1 && !/93467|63253|98480/.test(settings.phone1)
          ? settings.phone1
          : "+91 79016 50662";
      const safePhone2 =
        settings?.phone2 && !/93467|63253|98480/.test(settings.phone2)
          ? settings.phone2
          : "+91 79016 50663";
      const email =
        settings?.email && !/alaqmarak0810|rapidshift/i.test(settings.email)
          ? settings.email
          : "sales@classicconcepts.in";
      const address = (
        settings?.address && !/sakina\s*manzil|tirumalgherry/i.test(settings.address)
          ? settings.address
          : "1-6-44/2 Muthyam Reddy Estate, Yadamma Nagar, Kanajiguda, Alwal, Secunderabad, Telangana 500015"
      ).replace(/\\n/g, ", ");
      const resolvedLocation = resolveVerifiedGoogleMapsData({
        address,
        mapEmbedUrl: settings?.mapEmbedUrl,
        explicitMapUrl: locationsRaw.find((l) => l.mapUrl)?.mapUrl || null,
      });

      const catalogLines: string[] = [];

      // Enrich all products in-place with complete untruncated features, specifications, dimensions,
      // variants + variant pricing, normalized descriptionHtml & importantNoteHtml, industries, problemStatements, and resources
      // BEFORE building staticSystemPrompt so Section 4 has 100% of the database!
      const { enrichProductsWithCompleteKnowledge } = await import(
        "@/lib/product-knowledge"
      );
      await enrichProductsWithCompleteKnowledge(products, catalogLines);

      const defaultDepartmentContacts = [
        `  - Head Office & Manufacturing Desk: Phone: ${phone1}${safePhone2 ? `, ${safePhone2}` : ""}, Official WhatsApp: ${whatsappNumber}, Email: ${email}, info@classicconcepts.in`,
      ];
      const teamSummaryLines = [
        ...teamMembersRaw.map(
          (t) =>
            `  - ${t.name} (${t.position})${t.phone ? `, Phone: ${t.phone}` : ""}${t.email ? `, Email: ${t.email}` : ""}`
        ),
        ...defaultDepartmentContacts,
      ].join("\n");

      const machinerySummaryLines =
        machineryRaw.length > 0
          ? machineryRaw.map((m) => `  - ${m.name}: ${m.description || ""}`).join("\n")
          : [
              "  - Acrylic Diamond Polishing Machines (Models: 1350, 1650, 2550) & Carbide Tools Type A / Type B",
              "  - Computer Automatic & Double-Tube Acrylic Bending Machines (Models: YN-JW1200, YN-JW1500, YN-JW1800, YN-JW2400, CE53-JW1200/1500/1800/2400, ZD-1200, JW-1200B)",
              "  - Up & Down Heating Bending Machines (Models: CE53-SD-650B, CE53-SD-1200B, CE53-SD-1500B, CE53-SD-1800B, CE53-SD-2400B) & Multi-Roasting / 4-Heater Manual Benders (SD-1200F4, SD-1500F4, SD-1800F4)",
              "  - Acrylic Heating Ovens (600x600x350mm, 1300x800x350mm, 1600x1300x350mm, 2500x1300x350mm, 3100x1300x350mm)",
              "  - Computer Automatic Sheet Sawing Cutters (CE53-1326, CE53-2626), CNC Router (1325), Multi-Function Trimming Machine (Roller/Belt Type), Automatic Magnet Punching Machine (CE53-D30)",
              "  - Flame Polishing Machines (F-308, F-500), Water Cooling Chillers (CW-5300), Air Compressors, R4 Router Bits, V-Cutter Box Connect Bits",
            ].join("\n");

      const resourcesSummaryLines =
        resourcesRaw.length > 0
          ? resourcesRaw.map((r) => `  - ${r.title}: ${r.fileUrl}`).join("\n")
          : "  - Acrylic Podium Catalogue PDF, Acrylic Furniture Catalogue PDF, Acrylic Memento Catalogue PDF, Full Product Catalogue PDF";

      // Rich static system prompt (>2,100 tokens) so Anthropic Prompt Caching ALWAYS activates
      const staticSystemPrompt = `# CLASSIC CONCEPTS ACRYLIC PVT. LTD. - OFFICIAL KNOWLEDGE BASE & COMPLETE DATABASE DIRECTORY (ASSISTANT NAME: ACRIO)

## 1. COMPANY FACTS IN SIMPLE EVERYDAY LANGUAGE
- **Assistant Identity**: You are **ACRIO**, the official smart product helper and assistant for Classic Concepts Acrylic Private Limited.
- **Company Name**: Classic Concepts Acrylic Private Limited ("Classic Concepts", website: https://www.classicconcepts.in). Sister machinery brand: **Classic Edge 53** (https://classicedge53.com) for acrylic cutting, bending, and edge-polishing machines, consumables, and acrylic hardware accessories.
- **Experience**: Established **Since 2008**, making clear, durable, custom-made acrylic products across India and export markets.
- **Original Protected Podium Designs**: Classic Concepts holds official Patents, Registered Designs, and Copyright protection on its original acrylic podium models. Every podium comes with crated safe dispatch and a 5-Year to 10-Year Warranty against yellowing.
- **Factory & Equipment**: 16,000 sq. ft. modern factory and head office in Secunderabad / Hyderabad, India. Inside our factory we cut, bend, polish, print color logos, laser-engrave, and assemble everything directly without middlemen.
- **Material Quality (Explain Simply to Customers)**: ISO 9001:2015 certified quality, plus HYM, Global Accreditation, and ASCB accredited. We use thick, glass-clear imported cast acrylic sheets (from 3mm up to 25mm+ heavy slabs) that stay crystal clear, do not turn yellow over time, and have smooth, shiny polished edges with no sharp corners.
- **Delivery Across India & Worldwide**: Safe wooden-crated delivery across all of India (Hyderabad, Mumbai, Bengaluru, Delhi NCR, Chennai, Kolkata, Pune, Ahmedabad, and every state) plus exports to the USA, Canada, Mexico, Australia, South Africa, the UAE, and the Middle East.
- **Custom Orders, Add-Ons & Accessories**:
  - **Podium Add-Ons & Customizations**: LED Light Base (Blue, Red, White, Yellow, or Multi-color LED), Custom UV-Printed or Engraved Logo Panel (10x10 or 12x12 inches), Personalised Name Panel (22x2, 30x4, 43x4.5, or 45x5 inches), Built-in Storage Box (e.g. CCP067), Matching Side Tables/Pillars (e.g. CCP102), Gooseneck Microphone Mounts, Reading Lights, and Heavy-Duty Castor Wheels.
  - **Acrylic Hardware & Fabrication Accessories (188+ items)**: Acrylic Hinges (Standard, Super Thin, Spring, Mini Rib, Rib, Piano, Auto, Monster, Hardened, Counterbore, Square/Triangle/Slot Flexible Hinges), Handles & Knobs (C-Handle, High Gloss Door Handle, Door Knobs), Clear Plastic Screws (Countersunk, Round, Hex Bolt, Pin Screws, Hand Knob, Headless Set Screws, Menu/Book Screws), Anodized Spacers & Invisible Standoffs, Locks & Catches (Mini Camlock, Acrylic Camlock, Corner Lock, Hasp & Staple, Suitcase Latch, Magnetic Catch, Door Catch), L-Brackets, Angle Bars, Clear/Tinted/Radeon/Luminous Acrylic Rods & Square Rods, Acrylic/PC Tubes (Round, Square, Spiral, Reeded), Acrylic Balls & Half-Balls, Rotating Discs/Turntables, Keyway Frame Hangers, Hooks, Height Adjusters, Cabinet/Sofa Legs, and Specialty Acrylic Sheets (Metallic, Glitter, Silver/Gold Mirror, Water-Effect Chairmat, Radeon).
- **Official Contact Details**:
  - Factory & Head Office: ${address}
  - Google Maps Link: ${resolvedLocation.mapsUrl}
  - Primary Phone: ${phone1}${safePhone2 ? ` / ${safePhone2}` : ""}
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
- **Workshop Owners Looking for Machines, Consumables, or Acrylic Hardware Accessories**: Point them to Classic Edge 53 (/classicedge53) for acrylic bending, diamond edge-polishing, laser/CNC machines, router bits, carbide tools, and 188+ acrylic hardware accessories.

## 3. LIVE WEBSITE CATEGORIES, DEPARTMENTS, MACHINES & RESOURCES
- **Product Categories** (/shop/c/<slug>):
${categories.map((c) => `  - ${c.name} (slug: "${c.slug}", items: ${c.count})`).join("\n") || "  - General Acrylic Products"}
- **Acrylic Podium Sub-Categories** (/podiums/<slug>):
${podiumSubCategories.map((s) => `  - ${s.name} (slug: "${s.slug}", items: ${s.count})`).join("\n") || "  - All Acrylic Podiums (/podiums)"}
- **Industries Served** (/shop/industry/<slug>):
${industriesRaw.map((i) => `  - ${i.name} (slug: "${i.slug}")`).join("\n") || "  - Corporate, Hospitality, Education, Retail, Events"}
- **Solutions / Everyday Needs** (/shop/problem/<slug>):
${problemsRaw.map((ps) => `  - ${ps.name} (slug: "${ps.slug}")`).join("\n") || "  - Custom Display & Stage Solutions"}
- **Team Members & Specialist Departments**:
${teamSummaryLines}
- **Classic Edge 53 Machines & Consumables**:
${machinerySummaryLines}
- **Official Catalogues & Resources**:
${resourcesSummaryLines}

## 4. COMPLETE LIVE PRODUCT DATABASE (${products.length} ACTIVE PRODUCTS WITH DIMENSIONS, SPECS, VARIANTS & PRICES)
Total Active Catalog Items: ${products.length} across ${categories.length} main categories and ${podiumSubCategories.length} podium styles.
Every product in our database is listed below so you can look up any SKU (e.g. CCP053 to CCP111, CCP065, Wood Podium CCP064), dimension (e.g. 22 x 16 top surface, 32 to 44 inches height), variant, or feature with 100% accuracy:
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
1. NEVER make up product slugs or fake prices. Only use \`slug\` values that appear word-for-word in Section 4 or in the candidate catalog list provided in the turn prompt.
2. When a product says "Price on Request", explain simply that the price depends on quantity or custom size and we share a quick quote on WhatsApp or the Contact page.
3. ALWAYS write in simple layman English so someone who knows nothing about acrylic or manufacturing understands right away. Explain benefits plainly (for example: "thick glass-clear acrylic that stays clear for years", "smooth shiny edges", "we can print your logo on the front").
4. NEVER use em dashes ("—"), spaced en dashes (" – "), or "--". Use normal commas and short sentences.
5. NEVER use stiff AI buzzwords like bespoke, elevate, delve, meticulous, unparalleled, seamless, testament, leverage, robust, cutting-edge, state-of-the-art, utilize, optical-grade, or consultative.
6. Product descriptions must ALWAYS be short, easy-to-read bullet points, never long paragraphs.`;

      // Hash both the static knowledge base AND the full catalog lines so any product/price/spec edit bumps catalogHash immediately!
      const catalogHash = crypto
        .createHash("sha256")
        .update(`${staticSystemPrompt}\n---\n${catalogLines.join("\n")}`)
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
        address: resolvedLocation.address,
        mapsUrl: resolvedLocation.mapsUrl,
      };
    }
  );
}

export interface CachedProductSummary {
  dimensions?: { name: string; value: string; type: string }[];
  technicalSpecs?: { name: string; value: string; type: string }[];
  variants?: {
    id: string;
    name: string;
    price: number | null;
    imageUrl: string | null;
  }[];
  quickFacts?: { label: string; value: string }[];
  descriptionText?: string;
  importantNoteText?: string;
  searchKeywords?: string;
  podiumSubCategoryNames?: string[];
  industryObjects?: { name: string; slug: string; description: string }[];
  problemStatementObjects?: { name: string; slug: string; description: string }[];
  resources?: { name: string; url: string }[];
  isRegisteredDesign?: boolean;
  designRegistrationNo?: string | null;
  ipProtectionText?: string | null;
  videoUrl?: string | null;
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


export interface ConciergeProductCard {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  url: string;
  categoryName: string;
  subCategoryName: string | null;
  basePrice: number | null;
  discountPrice: number | null;
  discountBadge: string | null;
  effectivePrice: number | null;
  stockStatus: string;
  mainImage: string;
  reason?: string;
  dimensions?: { name: string; value: string; type: string }[];
  specs?: { name: string; value: string; type?: string }[];
  variants?: { id: string; name: string; price: number | null; imageUrl: string | null }[];
  features?: string[];
  quickFacts?: { label: string; value: string }[];
}

export interface ConciergeResponse {
  intent?: LocalQueryIntent;
  message: string;
  highlights: string[];
  products: ConciergeProductCard[];
  suggestedLinks: { label: string; href: string }[];
  followUpChips: string[];
  whatsappNumber: string;
  whatsappPrefill: string;
  source: "ai" | "cache" | "smart-local";
  modelUsed?: string;
  engineLabel?: string;
  aiDiagnostic?: string;
}

export interface AnthropicCallResult {
  ok: boolean;
  text: string;
  modelUsed?: string;
  agentName?: string;
  scope?: AiAgentScope;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  };
}

export function toCard(p: CachedProductSummary, reason?: string): ConciergeProductCard {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    url: `/shop/p/${p.slug}`,
    categoryName: p.categoryName,
    subCategoryName: p.subCategoryName,
    basePrice: p.basePrice,
    discountPrice: p.discountPrice,
    discountBadge: p.discountBadge,
    effectivePrice: p.effectivePrice,
    stockStatus: p.stockStatus,
    mainImage: p.mainImage,
    reason,
    dimensions: p.dimensions || [],
    specs: p.specs || [],
    variants: p.variants || [],
    features: p.features || [],
    quickFacts: p.quickFacts || [],
  };
}

export function extractJsonObject<T>(raw: string): T | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const tryParse = (candidate: string): T | null => {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      let repaired = "";
      let inStr = false;
      let escaped = false;
      for (let i = 0; i < candidate.length; i++) {
        const ch = candidate[i];
        if (escaped) {
          repaired += ch;
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          repaired += ch;
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inStr = !inStr;
          repaired += ch;
          continue;
        }
        if (inStr && ch === "\n") {
          repaired += "\\n";
          continue;
        }
        if (inStr && ch === "\r") continue;
        if (inStr && ch === "\t") {
          repaired += " ";
          continue;
        }
        repaired += ch;
      }
      try {
        return JSON.parse(repaired) as T;
      } catch {
        return null;
      }
    }
  };

  const direct = tryParse(unfenced);
  if (direct !== null) return direct;

  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return tryParse(unfenced.slice(start, end + 1));
  }
  return null;
}

/**
 * Low-overhead native `fetch` caller to Anthropic Messages API with Prompt Caching (`cache_control: ephemeral`).
 * Strictly locked to `claude-haiku-5-5` and routes credentials separately by `scope` ("client" vs "admin").
 */
export async function callClaudeHaiku(options: {
  scope: AiAgentScope;
  taskSystemInstruction: string;
  userPrompt: string;
  conversationMessages?: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  temperature?: number;
  effort?: "low" | "medium";
  useCatalogSystemCache?: boolean;
}): Promise<AnthropicCallResult> {
  const settings = await getAiRuntimeSettings();
  const agent = getAgentDefinition(options.scope);
  const scopedKey = resolveScopedApiKey(settings, options.scope);

  if (!scopedKey) {
    return {
      ok: false,
      text: "",
      scope: options.scope,
      agentName: agent.name,
      error:
        options.scope === "admin"
          ? "Admin AI API key is not configured yet in Admin -> Site Settings (or ANTHROPIC_ADMIN_API_KEY)."
          : "Client AI API key is not configured yet in Admin -> Site Settings (or ANTHROPIC_CLIENT_API_KEY).",
    };
  }
  if (!settings.aiEnabled) {
    return {
      ok: false,
      text: "",
      scope: options.scope,
      agentName: agent.name,
      error: "AI features are currently paused in Admin -> Site Settings.",
    };
  }

  const snapshot =
    options.useCatalogSystemCache !== false ? await getKnowledgeSnapshot() : null;

  const model = LOCKED_CLAUDE_MODEL; // Strictly claude-haiku-5-5 only

  const systemBlocks: Array<{
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
  }> = [];

  if (snapshot) {
    systemBlocks.push({
      type: "text",
      text: snapshot.staticSystemPrompt,
      cache_control: { type: "ephemeral" },
    });
  }

  systemBlocks.push({
    type: "text",
    text: options.taskSystemInstruction
      ? `${agent.coreSystemRules}\n\n${options.taskSystemInstruction}`
      : agent.coreSystemRules,
  });

  const rawMessages: { role: "user" | "assistant"; content: string }[] =
    options.conversationMessages && options.conversationMessages.length > 0
      ? options.conversationMessages
      : [
          {
            role: "user",
            content: options.userPrompt,
          },
        ];

  const apiMessages: Array<{
    role: "user" | "assistant";
    content:
      | string
      | Array<{
          type: "text";
          text: string;
          cache_control?: { type: "ephemeral" };
        }>;
  }> = rawMessages.map((m) => ({ role: m.role, content: m.content }));

  // Cache multi-turn conversation history up to the last completed exchange before the current turn's ephemeral retrieval payload
  if (apiMessages.length >= 3) {
    const targetIdx = apiMessages.length - 2;
    const prevTurn = apiMessages[targetIdx];
    const historyChars = apiMessages
      .slice(0, targetIdx + 1)
      .reduce((acc, m) => acc + (typeof m.content === "string" ? m.content.length : 0), 0);
    if (prevTurn && typeof prevTurn.content === "string" && historyChars >= 400) {
      prevTurn.content = [
        {
          type: "text",
          text: prevTurn.content,
          cache_control: { type: "ephemeral" },
        },
      ];
    }
  }

  const wireCandidates = [model, "claude-haiku-4-5-20251001"];

  try {
    let payload: any = null;
    let responseOk = false;
    let statusCode = 500;

    for (const wireModel of wireCandidates) {
      const isHaiku55 = wireModel === "claude-haiku-5-5";
      const requestBody: Record<string, unknown> = {
        model: wireModel,
        max_tokens: isHaiku55
          ? Math.max(options.maxTokens ?? 4096, 4096)
          : (options.maxTokens ?? 1024),
        system: systemBlocks,
        messages: apiMessages,
      };
      if (isHaiku55) {
        requestBody.thinking = { type: "adaptive" };
        requestBody.output_config = { effort: options.effort || "medium" };
      } else {
        requestBody.temperature = options.temperature ?? 0.25;
      }

      let response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": scopedKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(26000),
      });

      statusCode = response.status;
      payload = await response.json().catch(() => null);

      const extractPayloadText = (p: any) =>
        Array.isArray(p?.content)
          ? p.content
              .filter((b: any) => b?.type === "text")
              .map((b: any) => b.text)
              .join("\n")
              .trim()
          : "";

      const firstText = response.ok ? extractPayloadText(payload) : "";
      // If adaptive thinking starved the output token budget or truncated JSON, retry once without thinking
      if (
        isHaiku55 &&
        (!response.ok ||
          !firstText ||
          payload?.stop_reason === "max_tokens" ||
          (firstText.includes("{") && !firstText.endsWith("}")))
      ) {
        const fastBody: Record<string, unknown> = {
          model: wireModel,
          max_tokens: 4096,
          system: systemBlocks,
          messages: apiMessages,
        };
        const retryRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": scopedKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(fastBody),
          signal: AbortSignal.timeout(22000),
        }).catch(() => null);
        if (retryRes && retryRes.ok) {
          const retryPayload = await retryRes.json().catch(() => null);
          if (extractPayloadText(retryPayload)) {
            response = retryRes;
            statusCode = retryRes.status;
            payload = retryPayload;
          }
        }
      }

      if (response.ok) {
        responseOk = true;
        break;
      }

      const errType = String(payload?.error?.type || "");
      const errMsg = String(payload?.error?.message || "");
      const isModelAliasNotFound =
        response.status === 404 ||
        errType === "not_found_error" ||
        /model:\s*claude/i.test(errMsg);
      if (!isModelAliasNotFound) {
        break;
      }
    }

    if (!responseOk) {
      const errMsg = payload?.error?.message || `HTTP ${statusCode}`;
      return {
        ok: false,
        text: "",
        modelUsed: model,
        agentName: agent.name,
        scope: options.scope,
        error: errMsg,
      };
    }

    const text = Array.isArray(payload?.content)
      ? payload.content
          .filter((b: any) => b?.type === "text")
          .map((b: any) => b.text)
          .join("\n")
          .trim()
      : "";

    const hasThinkingBlock =
      Array.isArray(payload?.content) &&
      payload.content.some((b: any) => b?.type === "thinking");

    return {
      ok: true,
      text,
      modelUsed: model,
      agentName: agent.name,
      scope: options.scope,
      usage: {
        inputTokens: payload?.usage?.input_tokens ?? 0,
        outputTokens: payload?.usage?.output_tokens ?? 0,
        thinkingTokens: hasThinkingBlock ? (payload?.usage?.thinking_tokens ?? 1) : 0,
        cacheCreationInputTokens: payload?.usage?.cache_creation_input_tokens ?? 0,
        cacheReadInputTokens: payload?.usage?.cache_read_input_tokens ?? 0,
      },
    };
  } catch (err: any) {
    const lastError =
      err?.name === "TimeoutError"
        ? "AI request timed out."
        : err?.message || "Network error";
    return {
      ok: false,
      text: "",
      modelUsed: model,
      agentName: agent.name,
      scope: options.scope,
      error: lastError,
    };
  }
}

