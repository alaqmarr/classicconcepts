import { prisma } from "@/lib/db";
import type { CachedProductSummary } from "@/lib/ai-context";

export interface ProductSpecEntry {
  name: string;
  value: string;
  type: "dimension" | "specification" | string;
}

export interface ProductVariantEntry {
  id: string;
  name: string;
  price: number | null;
  imageUrl: string | null;
}

export interface ProductQuickFact {
  label: string;
  value: string;
}

export interface ProductRelationSummary {
  name: string;
  slug: string;
  description: string;
}

export interface ProductResourceEntry {
  name: string;
  url: string;
}

const DIMENSION_KEY_RE =
  /\b(height|width|depth|length|size|top\s*sheet|bottom\s*sheet|front\s*panel|shelf\s*size|logo\s*panel|base\s*size|reading\s*top|overall\s*size|dimension|dimensions|diameter|thickness)\b/i;

/**
 * Decodes HTML entities and converts rich HTML (`descriptionHtml`, `importantNoteHtml`)
 * into clean, structured plain text while preserving bullet items, table rows,
 * measurements (`24 × 20 Inches`), model codes, and care/important notes.
 */
export function normalizeRichHtmlToStructuredText(
  html: string | null | undefined
): string {
  if (!html) return "";
  let text = String(html);

  // Preserve structural breaks for lists, table cells/rows, and block elements
  text = text
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\s*\/\s*li\s*>/gi, "\n")
    .replace(/<\s*\/\s*(?:td|th)\s*>/gi, " | ")
    .replace(/<\s*\/\s*(?:tr|p|div|h[1-6]|ul|ol|table|blockquote|section)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  // Decode standard & numeric HTML entities (critical for &nbsp; in rich editor output)
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&times;/gi, "×")
    .replace(/&ndash;|&mdash;|[—–]/gi, "-")
    .replace(/&₹|&#8377;/gi, "₹")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : " ";
    });

  // Normalize whitespace per line and drop empty lines
  const lines = text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\s*\|\s*\|\s*/g, " | ")
        .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
        .replace(/[ \t\u00A0]+/g, " ")
        .trim()
    )
    .filter((line) => line.length > 0 && line !== "•");

  return lines.join("\n");
}

export function isDimensionSpecification(spec: {
  name: string;
  value: string;
  type?: string | null;
}): boolean {
  const cleanName = String(spec.name || "").trim();
  const cleanVal = String(spec.value || "").trim();
  if (/^model$/i.test(cleanName)) return false;
  if (String(spec.type || "").toLowerCase() === "dimension") return true;
  if (DIMENSION_KEY_RE.test(cleanName)) return true;
  if (
    /\b\d+(?:\.\d+)?\s*(?:×|x|\*)\s*\d+(?:\.\d+)?\s*(?:inch|inches|in|mm|cm|ft|")\b/i.test(
      cleanVal
    )
  ) {
    return true;
  }
  return false;
}

export function deriveQuickFactsFromProduct(params: {
  dimensions: ProductSpecEntry[];
  technicalSpecs: ProductSpecEntry[];
  variants: ProductVariantEntry[];
  stockStatus: string;
  isRegisteredDesign?: boolean;
  designRegistrationNo?: string | null;
}): ProductQuickFact[] {
  const facts: ProductQuickFact[] = [];
  const seenLabels = new Set<string>();
  const addFact = (label: string, value: string | null | undefined) => {
    const cleanLabel = String(label || "").trim();
    const cleanVal = String(value || "").trim();
    if (!cleanLabel || !cleanVal) return;
    const key = cleanLabel.toLowerCase();
    if (seenLabels.has(key)) return;
    seenLabels.add(key);
    facts.push({ label: cleanLabel, value: cleanVal });
  };

  for (const d of params.dimensions) {
    if (/height|top\s*sheet|bottom\s*sheet|front\s*panel|shelf|logo\s*panel/i.test(d.name)) {
      addFact(d.name, d.value);
    }
  }
  for (const s of params.technicalSpecs) {
    if (/material|pillars|wheels|weight|warranty|assembly|logo\s*custom/i.test(s.name)) {
      addFact(s.name, s.value);
    }
  }
  if (params.variants.length > 0) {
    const varSummary = params.variants
      .map((v) =>
        typeof v.price === "number" && v.price > 0
          ? `${v.name} (₹${v.price.toLocaleString("en-IN")})`
          : v.name
      )
      .join(", ");
    addFact("Available Variants", varSummary);
  }
  if (params.isRegisteredDesign) {
    addFact(
      "Design Registration",
      params.designRegistrationNo
        ? `Registered Design (${params.designRegistrationNo})`
        : "Official Registered Design"
    );
  }
  addFact("Stock Status", params.stockStatus);
  return facts;
}

/**
 * Enriches the cached product summaries in `getKnowledgeSnapshot()` with complete,
 * untruncated product knowledge (all features, all specifications + dimensions,
 * variants + variant prices, normalized `descriptionHtml` and `importantNoteHtml`,
 * `searchKeywords`, `industries`, `problemStatements`, `resources`, and IP metadata)
 * and appends a full digest to `catalogLines` so `catalogHash` updates on any edit.
 */
export async function enrichProductsWithCompleteKnowledge(
  products: CachedProductSummary[],
  catalogLines: string[]
): Promise<void> {
  if (!products || products.length === 0) return;

  const [deepRows, globalResources] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        description: true,
        descriptionHtml: true,
        importantNoteHtml: true,
        searchKeywords: true,
        isRegisteredDesign: true,
        designRegistrationNo: true,
        ipProtectionText: true,
        videoUrl: true,
        podiumSubCategory: { select: { name: true, slug: true } },
        podiumSubCategories: { select: { name: true, slug: true } },
        features: { select: { text: true } },
        specifications: { select: { name: true, value: true, type: true } },
        variants: { select: { id: true, name: true, price: true, imageUrl: true } },
        industries: { select: { name: true, slug: true, description: true } },
        problemStatements: { select: { name: true, slug: true, description: true } },
      },
    }),
    prisma.resource
      .findMany({
        select: { title: true, fileUrl: true, type: true },
        take: 30,
      })
      .catch(() => [] as { title: string; fileUrl: string; type: string }[]),
  ]);

  const byId = new Map(deepRows.map((r) => [r.id, r]));

  for (const p of products) {
    const row = byId.get(p.id);
    if (!row) continue;

    // 1. All features (no take:6 truncation)
    const allFeatures = row.features
      .map((f) => String(f.text || "").trim())
      .filter(Boolean);
    p.features = allFeatures;

    // 2. All specifications with type ("dimension" vs "specification", no take:8 truncation)
    const allSpecs: ProductSpecEntry[] = row.specifications
      .map((s) => ({
        name: String(s.name || "").replace(/[—–]/g, "-").trim(),
        value: String(s.value || "").replace(/[—–]/g, "-").trim(),
        type: String(s.type || "specification").trim(),
      }))
      .filter((s) => Boolean(s.name && s.value));

    p.specs = allSpecs;

    const dimensions = allSpecs.filter((s) => isDimensionSpecification(s));
    const technicalSpecs = allSpecs.filter((s) => !isDimensionSpecification(s));
    p.dimensions = dimensions;
    p.technicalSpecs = technicalSpecs;

    // 3. Variants & variant-specific pricing
    const variants: ProductVariantEntry[] = row.variants
      .map((v) => ({
        id: v.id,
        name: String(v.name || "").trim(),
        price: typeof v.price === "number" && v.price > 0 ? v.price : null,
        imageUrl: v.imageUrl || null,
      }))
      .filter((v) => Boolean(v.name));
    p.variants = variants;

    // 4. Rich HTML descriptions & important notes normalized to clean structured plain text
    const plainDesc = normalizeRichHtmlToStructuredText(row.description);
    const htmlDesc = normalizeRichHtmlToStructuredText(row.descriptionHtml);
    const combinedDesc = [plainDesc, htmlDesc]
      .filter(Boolean)
      .join("\n")
      .trim();
    const importantNoteText = normalizeRichHtmlToStructuredText(
      row.importantNoteHtml
    );

    p.descriptionText = combinedDesc;
    p.importantNoteText = importantNoteText;
    p.searchKeywords = String(row.searchKeywords || "").trim();

    // 5. Podium subcategories, industries, problem statements, resources, IP metadata
    const podiumSubNames = Array.from(
      new Set(
        [
          row.podiumSubCategory?.name,
          ...row.podiumSubCategories.map((psc) => psc.name),
        ].filter((x): x is string => Boolean(x))
      )
    );
    p.podiumSubCategoryNames = podiumSubNames;

    p.industryObjects = row.industries.map((ind) => ({
      name: ind.name,
      slug: ind.slug,
      description: normalizeRichHtmlToStructuredText(ind.description),
    }));
    p.problemStatementObjects = row.problemStatements.map((ps) => ({
      name: ps.name,
      slug: ps.slug,
      description: normalizeRichHtmlToStructuredText(ps.description),
    }));
    p.resources = globalResources.map((res) => ({
      name: res.title,
      url: res.fileUrl,
    }));
    p.isRegisteredDesign = Boolean(row.isRegisteredDesign);
    p.designRegistrationNo = row.designRegistrationNo || null;
    p.ipProtectionText = row.ipProtectionText || null;
    p.videoUrl = row.videoUrl || null;

    p.quickFacts = deriveQuickFactsFromProduct({
      dimensions,
      technicalSpecs,
      variants,
      stockStatus: p.stockStatus,
      isRegisteredDesign: p.isRegisteredDesign,
      designRegistrationNo: p.designRegistrationNo,
    });

    // 6. Expand searchBlob with ALL deep product fields for Stage 1 comprehensive discovery
    const variantBlob = variants
      .map((v) => `${v.name} ${v.price ? `₹${v.price} ${v.price}` : ""}`)
      .join(" ");
    const specBlob = allSpecs.map((s) => `${s.name} ${s.value}`).join(" ");
    const indBlob = (p.industryObjects || [])
      .map((i) => `${i.name} ${i.description}`)
      .join(" ");
    const probBlob = (p.problemStatementObjects || [])
      .map((ps) => `${ps.name} ${ps.description}`)
      .join(" ");

    p.searchBlob = [
      p.name,
      p.sku || "",
      p.slug.replace(/-/g, " "),
      p.categoryName,
      p.subCategoryName || "",
      ...(p.subCategorySlugs || []),
      ...podiumSubNames,
      p.searchKeywords || "",
      ...allFeatures,
      specBlob,
      variantBlob,
      combinedDesc,
      importantNoteText,
      indBlob,
      probBlob,
      p.designRegistrationNo || "",
      p.ipProtectionText || "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    // 7. Append deep product fingerprint to catalogLines so any spec/variant/feature/HTML edit invalidates cache
    catalogLines.push(
      `DEEP:${p.slug}|VARS:${variants
        .map((v) => `${v.name}:${v.price ?? ""}`)
        .join(",")}|SPECS:${allSpecs
        .map((s) => `${s.type}:${s.name}=${s.value}`)
        .join(";")}|FEATS:${allFeatures.join(";")}|KW:${
        p.searchKeywords || ""
      }|DESC:${combinedDesc.slice(0, 500)}|NOTE:${importantNoteText.slice(0, 300)}`
    );
  }
}

/**
 * Extracts explicit SKU / model codes (e.g. `CCP054`, `CCP055`, `CCP-053`, `CCP057S`)
 * or exact product slugs mentioned in a customer query.
 */
export function extractExplicitProductCodesOrSlugs(
  snapshotProducts: CachedProductSummary[],
  rawQuery: string
): CachedProductSummary[] {
  const qLower = String(rawQuery || "").toLowerCase();
  const qCompact = qLower.replace(/[^a-z0-9]/g, "");
  if (!qCompact) return [];

  const matched: CachedProductSummary[] = [];
  const seen = new Set<string>();

  // 1. Check explicit CCP / CC SKU patterns in the query
  const codeMatches = Array.from(
    qLower.matchAll(/\b(ccp[-_\s]*\d+[a-z]*|cc[-_\s]*[a-z0-9-]+)\b/gi)
  ).map((m) => m[1].replace(/[^a-z0-9]/gi, "").toLowerCase());

  for (const code of codeMatches) {
    for (const p of snapshotProducts) {
      const skuClean = (p.sku || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
      const slugClean = p.slug.replace(/[^a-z0-9]/gi, "").toLowerCase();
      const nameClean = p.name.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (
        (skuClean && skuClean === code) ||
        slugClean.endsWith(code) ||
        nameClean.includes(code)
      ) {
        if (!seen.has(p.slug)) {
          seen.add(p.slug);
          matched.push(p);
        }
      }
    }
  }

  // 2. Check exact slug or full product name mentions
  for (const p of snapshotProducts) {
    if (seen.has(p.slug)) continue;
    const slugLower = p.slug.toLowerCase();
    const nameLower = p.name.toLowerCase();
    if (
      (slugLower.length >= 5 && qLower.includes(slugLower)) ||
      (nameLower.length >= 6 && qLower.includes(nameLower))
    ) {
      seen.add(p.slug);
      matched.push(p);
    }
  }

  return matched;
}

/**
 * Parses a measurement string like `24 × 20 Inches`, `40–42 Inches`, `24.5 × 17.5 Inches`
 * into numeric values (`first`, `second`, `area`, `max`) for accurate comparisons.
 */
export function parseDimensionNumbers(rawVal: string | null | undefined): {
  first: number | null;
  second: number | null;
  area: number | null;
  max: number | null;
  raw: string;
} {
  const raw = String(rawVal || "").trim();
  if (!raw) return { first: null, second: null, area: null, max: null, raw: "" };

  const pairMatch = raw.match(
    /(\d+(?:\.\d+)?)\s*(?:["”']|inch|inches|in|mm|cm|ft)?\s*(?:×|x|\*)\s*(\d+(?:\.\d+)?)/i
  );
  if (pairMatch) {
    const a = Number.parseFloat(pairMatch[1]);
    const b = Number.parseFloat(pairMatch[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return {
        first: a,
        second: b,
        area: Math.round(a * b * 100) / 100,
        max: Math.max(a, b),
        raw,
      };
    }
  }

  const nums = Array.from(raw.matchAll(/\d+(?:\.\d+)?/g))
    .map((m) => Number.parseFloat(m[0]))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) {
    return { first: null, second: null, area: null, max: null, raw };
  }
  return {
    first: nums[0],
    second: nums[1] ?? null,
    area: nums.length >= 2 ? Math.round(nums[0] * nums[1] * 100) / 100 : null,
    max: Math.max(...nums),
    raw,
  };
}

export function findSpecValue(
  p: CachedProductSummary,
  pattern: RegExp
): string | null {
  const all = p.specs || [];
  const found = all.find((s) => pattern.test(s.name));
  return found ? found.value : null;
}

/**
 * Detects whether a customer query is asking for deep product details
 * (dimensions, technical specs, variants, features, comparisons, or unverified specs).
 */
export function isDeepProductDetailOrComparisonQuery(rawQuery: string): boolean {
  const q = String(rawQuery || "").toLowerCase();
  return /\b(dimension|dimensions|size|sizes|height|tall|width|wide|wider|widest|depth|top\s*sheet|reading\s*top|reading\s*surface|bottom\s*sheet|base\s*size|front\s*panel|shelf|logo\s*panel|spec|specs|specification|specifications|pillar|pillars|wheel|wheels|weight|heavy|warranty|assembly|fitting|diy|variant|variants|colour|color|colours|colors|finish|finishes|led\s*variant|blue\s*led|red\s*led|white\s*led|yellow\s*led|clear\s*frosted|black\s*frosted|white\s*frosted|compare|comparison|vs\.?|versus|difference|between|which\s+one|which\s+of\s+these|largest|bigger|smaller|feature|features|bullet|note|care\s*instruction|ccp\s*0\d+|20\s*mm|watt|wattage|power\s*consumption|voltage)\b/i.test(
    q
  );
}

/**
 * Stage 2 Question-Aware Context Hydrator for Website ACRIO prompts:
 * - Keeps general discovery lists compact while including key dimensions, specs, variants, and features.
 * - Hydrates full untruncated dimensions, technical specifications, variant price tables,
 *   feature bullets, rich descriptions, important notes, and applications for top target products
 *   when the visitor asks about specific products, dimensions, variants, features, or comparisons.
 */
export function formatQuestionAwareProductsForPrompt(
  candidates: CachedProductSummary[],
  rawQuery = "",
  maxItems = 12
): string {
  const slice = candidates.slice(0, maxItems);
  if (slice.length === 0) {
    return "### CANDIDATE CATALOG PRODUCTS FOR THIS QUERY\n(0 exact catalog products matched the visitor's current filters/budget.)";
  }

  const deepMode = isDeepProductDetailOrComparisonQuery(rawQuery);
  const fullDetailCount = deepMode ? Math.min(slice.length, 5) : Math.min(slice.length, 3);

  const lines = slice.map((p, idx) => {
    const priceStr = p.effectivePrice ? `₹${p.effectivePrice.toLocaleString("en-IN")}` : "Price on Request";
    const subStr = p.subCategoryName ? ` / ${p.subCategoryName}` : "";
    const skuStr = p.sku ? ` [SKU:${p.sku}]` : "";
    const dims = p.dimensions || p.specs.filter((s) => isDimensionSpecification(s));
    const techSpecs =
      p.technicalSpecs || p.specs.filter((s) => !isDimensionSpecification(s));
    const variants = p.variants || [];

    if (idx < fullDetailCount) {
      const dimStr =
        dims.length > 0
          ? `\n  Dimensions: ${dims.map((d) => `${d.name}: ${d.value}`).join(" | ")}`
          : "";
      const specStr =
        techSpecs.length > 0
          ? `\n  Specifications: ${techSpecs.map((s) => `${s.name}: ${s.value}`).join(" | ")}`
          : "";
      const varStr =
        variants.length > 0
          ? `\n  Variants & Prices: ${variants
              .map((v) =>
                typeof v.price === "number" && v.price > 0
                  ? `${v.name}: ₹${v.price.toLocaleString("en-IN")}`
                  : v.name
              )
              .join(" | ")}`
          : "";
      const featStr =
        p.features.length > 0
          ? `\n  Features (${p.features.length}): ${p.features.join(" ; ")}`
          : p.bullets.length > 0
          ? `\n  Highlights: ${p.bullets.join(" ; ")}`
          : "";
      const descSnippet = p.descriptionText
        ? `\n  Details: ${p.descriptionText.replace(/\n+/g, " ").slice(0, 360)}`
        : "";
      const noteSnippet = p.importantNoteText
        ? `\n  Important Notes: ${p.importantNoteText.replace(/\n+/g, " ").slice(0, 260)}`
        : "";
      const appStr =
        (p.industries && p.industries.length > 0) ||
        (p.problems && p.problems.length > 0)
          ? `\n  Applications: ${[
              ...(p.industries || []),
              ...(p.problems || []),
            ].join(", ")}`
          : "";
      return `- SLUG:"${p.slug}" | NAME:"${p.name}"${skuStr} | URL:"/shop/p/${p.slug}" | CAT:"${p.categoryName}${subStr}" | BASE_PRICE:${priceStr} | STOCK:${p.stockStatus}${dimStr}${specStr}${varStr}${featStr}${descSnippet}${noteSnippet}${appStr}`;
    }

    const compactSpecs = p.specs
      .slice(0, 6)
      .map((s) => `${s.name}:${s.value}`)
      .join("; ");
    const compactVars =
      variants.length > 0
        ? ` | Variants: ${variants
            .slice(0, 5)
            .map((v) => (v.price ? `${v.name}(₹${v.price})` : v.name))
            .join(", ")}`
        : "";
    const compactFeats =
      p.features.length > 0
        ? ` | Features: ${p.features.slice(0, 4).join("; ")}`
        : "";
    return `- SLUG:"${p.slug}" | NAME:"${p.name}"${skuStr} | URL:"/shop/p/${p.slug}" | CAT:"${p.categoryName}${subStr}" | PRICE:${priceStr} | STOCK:${p.stockStatus}${compactSpecs ? ` | Specs: ${compactSpecs}` : ""}${compactVars}${compactFeats}`;
  });

  return `### CANDIDATE CATALOG PRODUCTS FOR THIS QUERY (ONLY PICK SLUGS & EXACT FACTS FROM THIS LIST - NEVER INVENT SPECS OR DIMENSIONS)\n${lines.join("\n")}`;
}

/**
 * Builds an accurate, deterministic factual answer + highlight bullets when a visitor asks
 * about specific product dimensions, specifications, variant pricing, features, comparisons
 * ("Compare CCP054 and CCP055", "Which one is wider?", "Which of these has the largest reading top?"),
 * or unverified technical parameters.
 */
export function buildDeterministicDeepProductAdvisory(params: {
  rawQuery: string;
  matchedProducts: CachedProductSummary[];
}): {
  advisoryMessage: string | null;
  highlights: string[];
} {
  const { rawQuery, matchedProducts } = params;
  const q = String(rawQuery || "").trim().toLowerCase();
  if (matchedProducts.length === 0) {
    return { advisoryMessage: null, highlights: [] };
  }

  // 1. Check for unverified / missing technical spec questions (anti-hallucination guard)
  const asksUnverifiedThicknessOrPower =
    /\b(sheet\s*thickness|thickness\s*in\s*mm|exact\s*acrylic\s*sheet\s*thickness|20\s*mm|25\s*mm\s*thick\s*sheet|30\s*mm|50\s*mm|watt|wattage|power\s*consumption|voltage|ampere|fire\s*rating|ip65|ip67|waterproof\s*rating|load\s*capacity\s*in\s*kg)\b/i.test(
      q
    );
  if (asksUnverifiedThicknessOrPower) {
    const target = matchedProducts[0];
    const hasExactTermInBlob = target.specs.some((s) =>
      `${s.name} ${s.value}`.toLowerCase().includes(
        (q.match(/\b(20\s*mm|watt|voltage|ip65|ip67)\b/i)?.[1] || "____").toLowerCase()
      )
    );
    if (!hasExactTermInBlob) {
      const knownSpecs = target.specs
        .slice(0, 4)
        .map((s) => `${s.name}: ${s.value}`)
        .join(", ");
      return {
        advisoryMessage: `That specific technical detail is not listed in the catalog specifications for ${target.name}, so rather than guessing, here are the verified specs (${knownSpecs || "see product page"}). Please message our Sales & Fabrication Team on WhatsApp so we can confirm exact sheet thickness or custom options for you.`,
        highlights: [
          `Verified catalog specs for ${target.name}: ${knownSpecs || "Available on product page"}`,
          "Custom thickness and technical compatibility confirmed directly by our Fabrication Team",
        ],
      };
    }
  }

  // 2. Multi-product comparison or "which one is wider / largest reading top"
  const isComparisonOrSuperlative =
    matchedProducts.length >= 2 &&
    /\b(compare|comparison|vs\.?|versus|difference|between|which\s+one|which\s+of\s+these|wider|widest|largest|bigger|taller|reading\s*top|top\s*sheet)\b/i.test(
      q
    );

  if (isComparisonOrSuperlative) {
    const compareList = matchedProducts.slice(0, 4);

    // Check if specifically asking which one is wider or has the largest reading top
    if (/\b(wider|widest|largest\s*(?:reading\s*)?top|bigger\s*(?:reading\s*)?top|reading\s*top|top\s*sheet)\b/i.test(q)) {
      const withTopDims = compareList
        .map((p) => {
          const topVal =
            findSpecValue(p, /top\s*sheet|reading\s*top|top\s*surface|overall\s*size/i) ||
            findSpecValue(p, /front\s*panel|bottom\s*sheet/i);
          const parsed = parseDimensionNumbers(topVal);
          return { product: p, topVal, parsed };
        })
        .filter((x) => x.parsed.first !== null);

      if (withTopDims.length >= 2) {
        const sortedByWidth = [...withTopDims].sort(
          (a, b) =>
            (b.parsed.area || b.parsed.first || 0) -
            (a.parsed.area || a.parsed.first || 0)
        );
        const winner = sortedByWidth[0];
        const runnerUp = sortedByWidth[1];
        const summaryParts = withTopDims.map(
          (x) =>
            `${x.product.name} (${x.topVal}${
              x.product.effectivePrice
                ? `, ₹${x.product.effectivePrice.toLocaleString("en-IN")}`
                : ""
            })`
        );
        return {
          advisoryMessage: `${winner.product.name} has the wider and larger reading top at ${winner.topVal}, compared to ${runnerUp.product.name} at ${runnerUp.topVal}. Full top sheet sizes: ${summaryParts.join("; ")}.`,
          highlights: withTopDims.slice(0, 3).map(
            (x) =>
              `${x.product.name}: Top Sheet ${x.topVal}${
                findSpecValue(x.product, /height/i)
                  ? `, Height ${findSpecValue(x.product, /height/i)}`
                  : ""
              }`
          ),
        };
      }
    }

    // General side-by-side comparison (e.g. "Compare CCP054 and CCP055")
    const a = compareList[0];
    const b = compareList[1];
    const formatProdSummary = (p: CachedProductSummary) => {
      const price = p.effectivePrice
        ? `₹${p.effectivePrice.toLocaleString("en-IN")}`
        : "Price on Request";
      const height = findSpecValue(p, /height/i);
      const topSheet = findSpecValue(p, /top\s*sheet|reading\s*top/i);
      const bottomSheet = findSpecValue(p, /bottom\s*sheet/i);
      const frontPanel = findSpecValue(p, /front\s*panel/i);
      const pillars = findSpecValue(p, /pillar/i);
      const weight = findSpecValue(p, /weight/i);
      const warranty = findSpecValue(p, /warranty/i);
      const vars =
        p.variants && p.variants.length > 0
          ? p.variants
              .map((v) =>
                v.price ? `${v.name} (₹${v.price.toLocaleString("en-IN")})` : v.name
              )
              .join(", ")
          : null;
      const parts = [
        `Price: ${price}`,
        height ? `Height: ${height}` : null,
        topSheet ? `Top Sheet: ${topSheet}` : null,
        bottomSheet ? `Bottom Sheet: ${bottomSheet}` : null,
        frontPanel ? `Front Panel: ${frontPanel}` : null,
        pillars ? `Pillars: ${pillars}` : null,
        weight ? `Weight: ${weight}` : null,
        warranty ? `Warranty: ${warranty}` : null,
        vars ? `Variants: ${vars}` : null,
      ].filter(Boolean);
      return `${p.name} (${parts.join(", ")})`;
    };

    return {
      advisoryMessage: `Here is how ${a.name} and ${b.name} compare: ${formatProdSummary(a)} versus ${formatProdSummary(b)}.`,
      highlights: [formatProdSummary(a), formatProdSummary(b)],
    };
  }

  // 3. Single-product deep question (dimensions, variants, features, specs)
  const top = matchedProducts[0];
  if (
    /\b(dimension|dimensions|size|height|width|top\s*sheet|bottom\s*sheet|front\s*panel|shelf|logo\s*panel|how\s*tall|how\s*wide)\b/i.test(
      q
    ) &&
    top.dimensions &&
    top.dimensions.length > 0
  ) {
    const dimList = top.dimensions
      .map((d) => `${d.name}: ${d.value}`)
      .join(", ");
    return {
      advisoryMessage: `Here are the exact catalog dimensions for ${top.name}${
        top.effectivePrice ? ` (₹${top.effectivePrice.toLocaleString("en-IN")})` : ""
      }: ${dimList}.`,
      highlights: top.dimensions.slice(0, 4).map((d) => `${d.name}: ${d.value}`),
    };
  }

  if (
    /\b(variant|variants|colour|color|colours|colors|led\s*price|blue\s*led|red\s*led|white\s*led|yellow\s*led|frosted)\b/i.test(
      q
    ) &&
    top.variants &&
    top.variants.length > 0
  ) {
    const varList = top.variants
      .map((v) =>
        typeof v.price === "number" && v.price > 0
          ? `${v.name}: ₹${v.price.toLocaleString("en-IN")}`
          : v.name
      )
      .join(", ");
    return {
      advisoryMessage: `${top.name} is available in ${top.variants.length} variants with the following pricing: ${varList}.`,
      highlights: [
        `Variants (${top.variants.length}): ${varList}`,
        ...(top.effectivePrice
          ? [`Starting price: ₹${top.effectivePrice.toLocaleString("en-IN")}`]
          : []),
      ],
    };
  }

  if (
    /\b(feature|features|specification|specifications|spec|specs|pillar|pillars|wheel|wheels|warranty|assembly|weight)\b/i.test(
      q
    ) &&
    (top.specs.length > 0 || top.features.length > 0)
  ) {
    const specSummary = top.specs
      .map((s) => `${s.name}: ${s.value}`)
      .join(", ");
    const featSummary = top.features.slice(0, 4).join("; ");
    return {
      advisoryMessage: `Here are the verified specifications and features for ${top.name}: ${specSummary}${featSummary ? `. Key features: ${featSummary}.` : "."}`,
      highlights: [
        ...(specSummary ? [`Specs: ${specSummary}`] : []),
        ...(featSummary ? [`Features: ${featSummary}`] : []),
      ],
    };
  }

  return { advisoryMessage: null, highlights: [] };
}
