import type { CachedProductSummary, KnowledgeSnapshot } from "./initialise.acro.ai";

/**
 * Formats only the top-K pre-retrieved candidate products into a question-aware prompt section
 * (compact for general browsing, or full untruncated dimensions/specs/variants/features/notes for deep queries)
 * instead of dumping all 189 catalog products into every LLM turn.
 */
export function formatCandidateProductsForPrompt(
  candidates: CachedProductSummary[],
  maxItems = 15,
  rawQuery = ""
): string {
  const { formatQuestionAwareProductsForPrompt } = require("@/lib/product-knowledge") as typeof import("@/lib/product-knowledge");
  return formatQuestionAwareProductsForPrompt(candidates, rawQuery, maxItems);
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

export function extractWebsiteBudgetConstraints(rawQuery: string): {
  minPrice: number | null;
  maxPrice: number | null;
} {
  const q = String(rawQuery || "")
    .toLowerCase()
    .replace(/,/g, "");

  const parseAmount = (numStr: string, unitSuffix?: string): number | null => {
    const val = Number.parseFloat(numStr);
    if (!Number.isFinite(val) || val <= 0) return null;
    const u = (unitSuffix || "").trim().toLowerCase();
    if (u === "k" || u === "thousand") return Math.round(val * 1000);
    if (u === "lac" || u === "lacs" || u === "lakh" || u === "lakhs") {
      return Math.round(val * 100000);
    }
    if (u === "cr" || u === "crore" || u === "crores") {
      return Math.round(val * 10000000);
    }
    return Math.round(val);
  };

  const rangeMatches = Array.from(
    q.matchAll(
      /\b(?:between|from)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lac|lacs|lakh|lakhs|cr|crore|crores)?\s*(?:and|to|-)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lac|lacs|lakh|lakhs|cr|crore|crores)?\b/gi
    )
  );
  if (rangeMatches.length > 0) {
    const lastRange = rangeMatches[rangeMatches.length - 1];
    const low = parseAmount(lastRange[1], lastRange[2]);
    const high = parseAmount(lastRange[3], lastRange[4]);
    if (low !== null && high !== null) {
      return {
        minPrice: Math.min(low, high),
        maxPrice: Math.max(low, high),
      };
    }
  }

  let maxPrice: number | null = null;
  let minPrice: number | null = null;

  const maxMatches = Array.from(
    q.matchAll(
      /\b(?:under|below|less\s*than|upto|up\s*to|within|max|maximum|not\s*more\s*than|(?:increase|raise|extend|stretch|bump|change|update|set|keep)\s+(?:the\s+|my\s+|our\s+)?budget\s*(?:to|up\s*to|at|around|under|within)?|budget(?:\s*of|\s*is|\s*to|\s*up\s*to|\s*around|\s*under|\s*within)?(?:\s*around|\s*under|\s*within|\s*about)?|(?:make|keep)\s+it(?:\s+under|\s+up\s*to|\s+to)?|around|till)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lac|lacs|lakh|lakhs|cr|crore|crores)?\s*(?:rupees|rs\.?|inr|₹)?\b/gi
    )
  );
  for (const m of maxMatches) {
    const parsed = parseAmount(m[1], m[2]);
    if (parsed !== null && parsed >= 100) {
      maxPrice = parsed;
    }
  }

  const minMatches = Array.from(
    q.matchAll(
      /\b(?:above|over|more\s*than|min|minimum|starting\s*from|at\s*least)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lac|lacs|lakh|lakhs|cr|crore|crores)?\s*(?:rupees|rs\.?|inr|₹)?\b/gi
    )
  );
  for (const m of minMatches) {
    const parsed = parseAmount(m[1], m[2]);
    if (parsed !== null && parsed >= 100) {
      minPrice = parsed;
    }
  }

  return { minPrice, maxPrice };
}

export interface WebsiteConversationState {
  primaryProductQuery: string | null;
  productFamily: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  preferences: string[];
  onlyPodiums: boolean;
  isFollowUpRefinement: boolean;
  effectiveSearchQuery: string;
}

function detectWebsiteProductFamily(text: string): {
  family: string | null;
  canonicalQuery: string | null;
  onlyPodiums: boolean;
} {
  const clean = String(text || "").trim();
  const lower = clean.toLowerCase();
  if (/\b(furniture|interior|interiors|interiora|chair|chairs|stool|stools|table|tables|desk|console|they\s+sit|seating)\b/i.test(lower)) {
    return {
      family: "furniture",
      canonicalQuery: `${clean} acrylic chair stool table furniture`,
      onlyPodiums: false,
    };
  }
  if (/\b(signage|signages|name\s*plate|name\s*plates|nameplate|nameplates|name\s*board)\b/i.test(lower)) {
    return {
      family: "signage",
      canonicalQuery: `${clean} acrylic signage name plate sign holder`,
      onlyPodiums: false,
    };
  }
  if (/\b(pulpit|pulpits|podium|podiums|lectern|lecterns|rostrum|rostrums|ccpo?\s*0?\d{2,3})\b/i.test(lower)) {
    return {
      family: "podium",
      canonicalQuery: `${clean} pulpit podium`,
      onlyPodiums: true,
    };
  }
  if (/\b(trophy|trophies|memento|mementos|award|awards|plaque|plaques|medal|medals|gift|gifts|corporate\s*clients?|paperweight|pen\s*stand)\b/i.test(lower)) {
    return {
      family: "award",
      canonicalQuery: `${clean} acrylic trophy award memento corporate gift`,
      onlyPodiums: false,
    };
  }
  const words = splitWords(lower).filter(
    (t) => t.length >= 2 && !QUERY_STOP_WORDS.has(t)
  );
  const matchedNoun = words.find((tok) =>
    Array.from(EXPLICIT_PRODUCT_TERMS).some((pt) => tokenMatchesWord(tok, pt))
  );
  if (matchedNoun) {
    return { family: matchedNoun, canonicalQuery: clean, onlyPodiums: false };
  }
  return { family: null, canonicalQuery: null, onlyPodiums: false };
}

export function deriveWebsiteConversationState(
  history:
    | { role: "user" | "assistant"; text?: string; content?: string }[]
    | undefined,
  currentQuery: string
): WebsiteConversationState {
  const cleanCurrent = String(currentQuery || "").trim();
  const userTurns = (history || [])
    .filter(
      (h) =>
        h.role === "user" && Boolean(String(h.text || h.content || "").trim())
    )
    .map((h) => String(h.text || h.content || "").trim());

  if (userTurns.length > 0 && userTurns[userTurns.length - 1] === cleanCurrent) {
    userTurns.pop();
  }

  let primaryProductQuery: string | null = null;
  let productFamily: string | null = null;
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let preferences: string[] = [];
  let onlyPodiums = false;

  const extractPrefs = (txt: string): string[] => {
    const l = txt.toLowerCase();
    const out: string[] = [];
    if (/\b(most\s*premium|premium|high\s*end|flagship|best|luxury)\b/i.test(l)) out.push("premium");
    if (/\b(transparent|clear|crystal\s*clear)\b/i.test(l)) out.push("transparent");
    if (/\b(frosted|matte)\b/i.test(l)) out.push("frosted");
    if (/\b(wooden|wood|black|white|gold|led)\b/i.test(l)) {
      const m = l.match(/\b(wooden|wood|black|white|gold|led)\b/i);
      if (m) out.push(m[1].toLowerCase());
    }
    return out;
  };

  const applyTurn = (turnText: string) => {
    const lower = turnText.toLowerCase();
    const det = detectWebsiteProductFamily(turnText);
    const isTopicReset =
      !det.family &&
      /\b(different\s*(?:query|question|requirement|topic)|another\s*(?:query|question|topic)|something\s*else|forget\s*(?:that|it)|start\s*over|new\s*(?:query|question|topic)|i\s+have\s+a\s+(?:query|question|doubt))\b/i.test(
        lower
      );
    if (isTopicReset) {
      primaryProductQuery = null;
      productFamily = null;
      minPrice = null;
      maxPrice = null;
      preferences = [];
      onlyPodiums = false;
      return;
    }

    const b = extractWebsiteBudgetConstraints(turnText);
    const prefs = extractPrefs(turnText);

    if (det.family && productFamily && det.family !== productFamily) {
      productFamily = det.family;
      primaryProductQuery = det.canonicalQuery || turnText;
      onlyPodiums = det.onlyPodiums;
      minPrice = b.minPrice;
      maxPrice = b.maxPrice;
      preferences = prefs;
      return;
    }

    if (det.family) {
      productFamily = det.family;
      primaryProductQuery = det.canonicalQuery || turnText;
      onlyPodiums = det.onlyPodiums;
    }
    if (b.maxPrice !== null || b.minPrice !== null) {
      maxPrice = b.maxPrice;
      minPrice = b.minPrice;
    }
    if (prefs.length > 0) {
      preferences = Array.from(new Set([...preferences, ...prefs]));
    }
  };

  for (const u of userTurns) {
    applyTurn(u);
  }

  const currentDet = detectWebsiteProductFamily(cleanCurrent);
  const currentBudget = extractWebsiteBudgetConstraints(cleanCurrent);
  const currentPrefs = extractPrefs(cleanCurrent);
  const isFollowUpRefinement =
    Boolean(primaryProductQuery) &&
    !currentDet.family &&
    (currentBudget.maxPrice !== null ||
      currentBudget.minPrice !== null ||
      currentPrefs.length > 0 ||
      /\b(budget|price|cost|under|below|above|around|increase|raise|stretch|extend|premium|transparent|clear|frosted|show\s*more|other\s*options|compare|comparison|vs\.?|versus|difference|first\s*two|top\s*two|which\s*one|which\s*of\s*these|wider|widest|largest|bigger|taller|reading\s*top|top\s*sheet|bottom\s*sheet|front\s*panel|dimension|dimensions|size|height|width|spec|specs|specification|specifications|variant|variants|colour|color|colours|colors|led|pillar|pillars|wheel|wheels|warranty|weight|feature|features|20\s*mm|watt|voltage)\b/i.test(
        cleanCurrent
      ));

  applyTurn(cleanCurrent);

  const nonGenericPrefs = preferences.filter((p) => p !== "premium");
  const effectiveSearchQuery = isFollowUpRefinement && primaryProductQuery
    ? [primaryProductQuery, ...nonGenericPrefs].join(" ").trim()
    : cleanCurrent;

  return {
    primaryProductQuery,
    productFamily,
    minPrice,
    maxPrice,
    preferences,
    onlyPodiums,
    isFollowUpRefinement,
    effectiveSearchQuery,
  };
}

/**
 * Instant, zero-credit local synonym & intent matcher.
 * Powers <1ms search AND guarantees non-blocking customer UX from the 100MB Redis snapshot
 * even when AI cache misses or before AI credentials are added!
 */
export function localSmartProductMatch(
  snapshot: KnowledgeSnapshot,
  rawQuery: string,
  options?: {
    limit?: number;
    onlyPodiums?: boolean;
    categorySlug?: string;
    maxPrice?: number | null;
    minPrice?: number | null;
    preferPremium?: boolean;
    rawTurnQuery?: string;
  }
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

  // 1. Informational handoff question ("whom will you connect me to", "who handles custom quotes", "who is your sales manager")
  if (
    /\b(?:who|whom|which\s*(?:team|person|department|member|specialist)|what\s*(?:team|department))\s+(?:will|would|do|can|are)\s+you\s+(?:connect|transfer|assign|hand\s*over|forward)\b|\b(?:to\s+whom|with\s+whom)\s+(?:will|would|do|can)\s+you\s+connect\b|\b(?:who|whom)\s+(?:handles|takes\s*care\s*of|manages|looks\s*after|is\s+in|is\s+your)\s+(?:this|my\s*chat|custom|orders|sales|support|enquiries|inquiries|team|manager|executive)\b|\b(?:can\s+i\s+know|tell\s+me)\s+(?:who|whom)\s+(?:you\s+will\s+connect|i\s+will\s+(?:talk|speak)\s+(?:to|with))\b|\bhow\s+does\s+(?:the\s+)?(?:handoff|human\s*support|sales\s*team)\s+work\b/i.test(
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

  // 1b. Direct request to talk to a human / sales specialist on the website
  if (
    !/^(?:who|whom|which\s+team|what\s+team|how\s+does)\b/i.test(q) &&
    /\b(talk\s*to\s*(?:a\s*|the\s*|your\s*)?(?:team|human|person|agent|staff|sales|someone|manager|executive)|speak\s*(?:to|with)\s*(?:a\s*|the\s*|your\s*)?(?:team|human|person|agent|staff|sales|someone|manager|executive)|connect\s*me(?:\s*(?:now|right\s*away|please)|\s*(?:to|with)\s*(?:a\s*|the\s*|your\s*)?(?:team|human|person|agent|staff|sales|someone|manager|executive))?|yes\s*,?\s*(?:please\s*)?connect\s*me|human\s*agent|real\s*person|call\s*me|can\s+someone\s+call|please\s*call|need\s*a\s*call|want\s*a\s*call)\b/i.test(
      q
    )
  ) {
    return {
      intent: "human_handoff_info",
      products: [],
      matchedCategories: [],
      advisoryMessage:
        "Sure! Click the WhatsApp button below to connect directly with our Classic Concepts Sales & Fabrication Team right now.",
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
        "Hi Classic Concepts! Please connect me with the Sales Team.",
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
        "I am ACRIO, Classic Concepts' product assistant. Tell me what acrylic product, event, or workplace setup you need and I will show matching options from our live catalog.",
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

  // 3. Company / factory / location / shipping info question ("where is your factory", "share location", "map")
  if (
    /\b(where\s+(?:are\s+you|is\s+your)\s*(?:located|based|factory|office|workshop|shop|company|plant|unit|from)?|(?:what\s+is|share|send|give|need|want|show)\s*(?:me\s*)?(?:your\s*)?(?:location|map\s*location|google\s*map|maps\s*(?:link|url)?|directions?|address|factory\s*address|office\s*address|office\s*location|factory\s*location|working\s*hours|timings)|^\s*(?:map\s*location|location|your\s*location|address|office\s*address|directions)\s*\??$|visit\s+(?:your\s+)?(?:factory|office|showroom)|what\s+(?:does|is)\s+classic\s+(?:concepts|edge(?:\s*53)?)(?:\s+do)?|difference\s+between\s+classic\s+concepts\s+and\s+classic\s+edge|tell\s+me\s+about\s+(?:your\s+company|classic\s+concepts)|do\s+you\s+(?:ship|deliver)\s+(?:across|all\s+over|pan)\s+india|do\s+you\s+provide\s+gst)\b/i.test(
      q
    ) &&
    !/\b(under|below|above|price\s+of|cost\s+of|buy|looking\s+for\s+a)\b/i.test(q)
  ) {
    const isLocationFocus =
      /\b(where|location|address|map|directions?|visit|office|factory|workshop)\b/i.test(q);
    return {
      intent: "company_info",
      products: [],
      matchedCategories: [],
      advisoryMessage: isLocationFocus
        ? `Our factory & head office is at ${snapshot.address} (Mon to Sat, 10:00 AM to 7:00 PM). Google Maps: ${snapshot.mapsUrl}`
        : `Classic Concepts manufactures cast-acrylic stage podiums, awards, hotel and retail display stands, and custom acrylic boxes from our Secunderabad / Hyderabad factory (${snapshot.mapsUrl}), with pan-India delivery and full GST billing.`,
      highlights: isLocationFocus
        ? [`Secunderabad Factory: Mon to Sat, 10 AM to 7 PM`, `Pan-India dispatch & GST billing`]
        : [],
      followUpChips: [
        "Explore stage podiums",
        "Browse awards & trophies",
        "Ask about custom fabrication",
      ],
      suggestedLinks: [
        { label: "Open in Google Maps", href: snapshot.mapsUrl },
        { label: "Contact Us", href: "/contact" },
      ],
      whatsappPrefill:
        "Hi Classic Concepts! Please share your factory location pin and details.",
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

  // Price ceiling/floor detection e.g. "under ₹25,000" or "increase the budget to ₹30,000"
  const extractedBudget = extractWebsiteBudgetConstraints(cleanRaw);
  const maxPrice =
    options?.maxPrice !== undefined ? options.maxPrice : extractedBudget.maxPrice;
  const minPriceFilter =
    options?.minPrice !== undefined ? options.minPrice : extractedBudget.minPrice;
  const preferPremium =
    options?.preferPremium !== undefined
      ? options.preferPremium
      : /\b(most\s*premium|premium|high\s*end|flagship|top\s*end)\b/i.test(q);

  const isGiftOrAwardIntent =
    matchedGroups.has("award") && !matchedGroups.has("podium");

  const isPodiumIntent =
    Boolean(options?.onlyPodiums) ||
    (matchedGroups.has("podium") && !matchedGroups.has("award"));

  const candidatePool = isPodiumIntent
    ? pool.filter((p) => p.isPodium)
    : pool;

  const {
    extractExplicitProductCodesOrSlugs,
    buildDeterministicDeepProductAdvisory,
    scoreProductDimensionAndPhraseMatch,
  } = require("@/lib/product-knowledge") as typeof import("@/lib/product-knowledge");
  const explicitCodeMatches = extractExplicitProductCodesOrSlugs(
    pool,
    cleanRaw
  );
  const explicitSlugSet = new Set(explicitCodeMatches.map((p) => p.slug));

  const effectiveCandidatePool =
    explicitCodeMatches.length > 0
      ? Array.from(new Set([...explicitCodeMatches, ...candidatePool]))
      : candidatePool;

  const scored = effectiveCandidatePool.map((p) => {
    let score = 0;
    const nameLower = p.name.toLowerCase();
    const skuLower = (p.sku || "")
      .toLowerCase()
      .replace(/^ccpo(\d)/, "ccp0$1");
    const nameWords = splitWords(nameLower);
    const catWords = splitWords(
      `${p.categoryName} ${p.subCategoryName || ""} ${(p.podiumSubCategoryNames || []).join(" ")}`
    );
    const blobWords = splitWords(p.searchBlob);
    const featLower = (p.features || []).join(" ").toLowerCase();
    const descLower = (p.descriptionText || "").toLowerCase();
    const noteLower = (p.importantNoteText || "").toLowerCase();
    const specLower = (p.specs || [])
      .map((s) => `${s.name} ${s.value}`)
      .join(" ")
      .toLowerCase();
    const varLower = (p.variants || [])
      .map((v) => `${v.name} ${v.price ?? ""}`)
      .join(" ")
      .toLowerCase();
    const appLower = [
      ...(p.industries || []),
      ...(p.problems || []),
      ...(p.industryObjects || []).map((i) => `${i.name} ${i.description}`),
      ...(p.problemStatementObjects || []).map((ps) => `${ps.name} ${ps.description}`),
    ]
      .join(" ")
      .toLowerCase();

    if (explicitSlugSet.has(p.slug)) {
      score += 320;
    }

    score += scoreProductDimensionAndPhraseMatch(p, cleanRaw);

    if (nameLower === q || (skuLower && skuLower === q)) score += 140;
    else if (q.length >= 4 && skuLower && skuLower.includes(q)) score += 90;
    else if (q.length >= 5 && meaningfulTokens.length >= 2 && nameLower.includes(q)) {
      score += 70;
    } else if (
      q.length >= 6 &&
      meaningfulTokens.length >= 2 &&
      (featLower.includes(q) || descLower.includes(q) || noteLower.includes(q) || specLower.includes(q) || appLower.includes(q))
    ) {
      score += 48;
    }

    for (const tok of meaningfulTokens) {
      if (skuLower && tok.length >= 3 && skuLower.includes(tok)) score += 45;
      if (nameWords.some((nw) => tokenMatchesWord(tok, nw))) score += 30;
      if (catWords.some((cw) => tokenMatchesWord(tok, cw))) score += 22;
      if (appLower && splitWords(appLower).some((aw) => tokenMatchesWord(tok, aw))) score += 20;
      if (varLower && splitWords(varLower).some((vw) => tokenMatchesWord(tok, vw))) score += 18;
      if (specLower && splitWords(specLower).some((sw) => tokenMatchesWord(tok, sw))) score += 16;
      if (featLower && splitWords(featLower).some((fw) => tokenMatchesWord(tok, fw))) score += 16;
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
      score = -1000;
    }

    const topicalScore = score;

    if (maxPrice !== null || minPriceFilter !== null) {
      const hasValidPrice =
        typeof p.effectivePrice === "number" && p.effectivePrice > 0;
      if (!hasValidPrice) {
        score = -1000;
      } else {
        if (maxPrice !== null && p.effectivePrice! > maxPrice) {
          score = -1000;
        } else if (maxPrice !== null) {
          score += 18;
        }
        if (minPriceFilter !== null && p.effectivePrice! < minPriceFilter) {
          score = -1000;
        } else if (minPriceFilter !== null) {
          score += 12;
        }
      }
    }

    return { product: p, score, topicalScore };
  });

  const filteredScored = scored.filter((item) => item.score >= 16);

  const matched = filteredScored
    .sort((a, b) => {
      const aExplicit = explicitSlugSet.has(a.product.slug) ? 1 : 0;
      const bExplicit = explicitSlugSet.has(b.product.slug) ? 1 : 0;
      if (aExplicit !== bExplicit) return bExplicit - aExplicit;
      if (preferPremium) {
        const aPriced = typeof a.product.effectivePrice === "number" && a.product.effectivePrice > 0 ? a.product.effectivePrice : 0;
        const bPriced = typeof b.product.effectivePrice === "number" && b.product.effectivePrice > 0 ? b.product.effectivePrice : 0;
        if (aPriced !== bPriced) return bPriced - aPriced;
      }
      return b.score - a.score || a.product.name.localeCompare(b.product.name);
    })
    .slice(0, limit)
    .map((item) => item.product);

  if (matched.length === 0) {
    const topicalPriced = scored
      .filter(
        (item) =>
          item.topicalScore >= 16 &&
          typeof item.product.effectivePrice === "number" &&
          item.product.effectivePrice > 0
      )
      .sort(
        (a, b) =>
          (a.product.effectivePrice || 0) - (b.product.effectivePrice || 0)
      );
    const lowestStartingPrice = topicalPriced[0]?.product.effectivePrice ?? null;
    const budgetMissMsg =
      (maxPrice !== null || minPriceFilter !== null) && lowestStartingPrice !== null
        ? `We do not have a ready catalog option within that budget for "${cleanRaw}". Our ready options in this category start from ₹${lowestStartingPrice.toLocaleString("en-IN")}. Let us know if you would like to view those options or message our team on WhatsApp.`
        : `We could not find a ready catalog item matching "${cleanRaw}". Tell me how you plan to use it, or message our team on WhatsApp if you want to check whether we can make it in acrylic.`;

    return {
      intent: "no_match",
      products: [],
      matchedCategories: [],
      advisoryMessage: budgetMissMsg,
      highlights:
        lowestStartingPrice !== null
          ? [`Ready options in this category start from ₹${lowestStartingPrice.toLocaleString("en-IN")}`]
          : [],
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
  const deepAdvisory = buildDeterministicDeepProductAdvisory({
    rawQuery: options?.rawTurnQuery || cleanRaw,
    matchedProducts: matched,
  });

  if (deepAdvisory.advisoryMessage) {
    advisoryMessage = deepAdvisory.advisoryMessage;
  } else if (isGiftOrAwardIntent) {
    advisoryMessage = `Here ${matched.length === 1 ? "is" : "are"} ${matched.length} acrylic award and gift ${matched.length === 1 ? "option" : "options"} from our catalog for "${cleanRaw}".`;
  } else if (matched.every((p) => p.isPodium)) {
    advisoryMessage = `Here ${matched.length === 1 ? "is" : "are"} ${matched.length} matching acrylic ${matched.length === 1 ? "podium" : "podiums"} for "${cleanRaw}".`;
  } else {
    const catPhrase =
      topCatLabels.length > 0 ? ` in ${topCatLabels.slice(0, 2).join(" and ")}` : "";
    advisoryMessage = `Found ${matched.length} matching catalog ${matched.length === 1 ? "product" : "products"}${catPhrase} for "${cleanRaw}".`;
  }

  const highlights: string[] = [];
  if (deepAdvisory.highlights.length > 0) {
    highlights.push(...deepAdvisory.highlights);
  } else {
    if (minPrice !== null) {
      highlights.push(`Listed catalog options starting from ₹${minPrice.toLocaleString("en-IN")}`);
    }
    if (isGiftOrAwardIntent) {
      highlights.push("Suitable for event prizes, student recognition, and batch orders");
    } else if (matched.some((p) => p.isPodium)) {
      highlights.push("Available in full-clear, frosted, LED, and wood-accent podium styles");
    }
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

