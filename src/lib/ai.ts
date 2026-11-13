import {
  getAiRuntimeSettings,
  resolveScopedApiKey,
  getKnowledgeSnapshot,
  getCachedAiResponse,
  setCachedAiResponse,
  normalizeQueryForCache,
  localSmartProductMatch,
  type CachedProductSummary,
  type LocalQueryIntent,
} from "@/lib/ai-context";
import {
  getAgentDefinition,
  LOCKED_CLAUDE_MODEL,
  type AiAgentScope,
} from "@/lib/ai-agents";
import { cleanAiPatterns } from "@/lib/ai-writing-rules";
import {
  bulletsToCleanHtml,
  bulletsToPlainSummary,
  extractBulletsFromContent,
} from "@/lib/bullet-formatter";

export interface ConciergeProductCard {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  categoryName: string;
  subCategoryName: string | null;
  basePrice: number | null;
  discountPrice: number | null;
  discountBadge: string | null;
  effectivePrice: number | null;
  stockStatus: string;
  mainImage: string;
  reason?: string;
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

interface AnthropicCallResult {
  ok: boolean;
  text: string;
  modelUsed?: string;
  agentName?: string;
  scope?: AiAgentScope;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
  };
}

let clientCircuitOpenUntil = 0;
let clientCircuitReason = "";

function toCard(p: CachedProductSummary, reason?: string): ConciergeProductCard {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    categoryName: p.categoryName,
    subCategoryName: p.subCategoryName,
    basePrice: p.basePrice,
    discountPrice: p.discountPrice,
    discountBadge: p.discountBadge,
    effectivePrice: p.effectivePrice,
    stockStatus: p.stockStatus,
    mainImage: p.mainImage,
    reason,
  };
}

function extractJsonObject<T>(raw: string): T | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Strip optional markdown code fences
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(unfenced) as T;
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(unfenced.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Low-overhead native `fetch` caller to Anthropic Messages API with Prompt Caching (`cache_control: ephemeral`).
 * Strictly locked to `claude-haiku-5-5` and routes credentials separately by `scope` ("client" vs "admin").
 */
export async function callClaudeHaiku(options: {
  scope: AiAgentScope;
  taskSystemInstruction: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
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

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": scopedKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 600,
        temperature: options.temperature ?? 0.25,
        system: systemBlocks,
        messages: [
          {
            role: "user",
            content: options.userPrompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(18000),
    });

    const payload: any = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = payload?.error?.message || `HTTP ${response.status}`;
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

    return {
      ok: true,
      text,
      modelUsed: model,
      agentName: agent.name,
      scope: options.scope,
      usage: {
        inputTokens: payload?.usage?.input_tokens ?? 0,
        outputTokens: payload?.usage?.output_tokens ?? 0,
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

/**
 * Customer Concierge: Understands even vague user descriptions ("we run a hotel", "college stage",
 * "jewellery shop", "need 50 awards") with two-tier caching + zero-blocking fallback.
 */
export async function runCustomerConcierge(
  rawQuery: string,
  allowAiGeneration = true
): Promise<ConciergeResponse> {
  const snapshot = await getKnowledgeSnapshot();
  const settings = await getAiRuntimeSettings();
  const cleanQuery = (rawQuery || "").trim().slice(0, 500);

  if (!cleanQuery) {
    const local = localSmartProductMatch(snapshot, "", { limit: 4 });
    return {
      intent: local.intent,
      message: local.advisoryMessage,
      highlights: local.highlights,
      products: local.products.map((p) => toCard(p)),
      suggestedLinks: local.suggestedLinks,
      followUpChips: local.followUpChips,
      whatsappNumber: snapshot.whatsappNumber,
      whatsappPrefill: local.whatsappPrefill,
      source: "smart-local",
      modelUsed: settings.clientApiKey && settings.aiEnabled ? LOCKED_CLAUDE_MODEL : "local-catalog",
      engineLabel:
        settings.clientApiKey && settings.aiEnabled
          ? "Claude Haiku 5.5 Ready"
          : "Local Catalog Match • AI Key Not Set",
    };
  }

  const normalizedKey = normalizeQueryForCache(cleanQuery);

  // 1. Check Persistent Response Cache FIRST (0 AI credits!)
  type CachedShape = {
    intent?: LocalQueryIntent;
    message: string;
    highlights: string[];
    recommendations: { slug: string; reason?: string }[];
    suggestedLinks: { label: string; href: string }[];
    followUpChips: string[];
    whatsappPrefill: string;
    modelUsed?: string;
  };

  const cached = await getCachedAiResponse<CachedShape>(
    "concierge:v2",
    normalizedKey,
    snapshot.catalogHash
  );

  if (cached) {
    const bySlug = new Map(snapshot.products.map((p) => [p.slug, p]));
    const hydrated = (cached.recommendations || [])
      .map((r) => {
        const prod = bySlug.get(r.slug);
        return prod ? toCard(prod, r.reason ? cleanAiPatterns(r.reason) : undefined) : null;
      })
      .filter((x): x is ConciergeProductCard => Boolean(x));

    return {
      intent: cached.intent || (hydrated.length > 0 ? "product_match" : "role_clarify"),
      message: cleanAiPatterns(cached.message),
      highlights: (cached.highlights || []).map((h) => cleanAiPatterns(h)),
      products: hydrated,
      suggestedLinks: cached.suggestedLinks || [{ label: "Browse Full Catalog", href: "/shop" }],
      followUpChips: (cached.followUpChips || []).map((c) => cleanAiPatterns(c)),
      whatsappNumber: snapshot.whatsappNumber,
      whatsappPrefill: cleanAiPatterns(
        cached.whatsappPrefill ||
          `Hi Classic Concepts! I am looking for help with: ${cleanQuery}`
      ),
      source: "cache",
      modelUsed: cached.modelUsed || LOCKED_CLAUDE_MODEL,
      engineLabel: "Claude Haiku 5.5 • Instant Cache",
    };
  }

  // 2. Call Client Agent (Claude Haiku 5.5) using Dedicated Client API Key
  let lastAiError: string | undefined;
  const now = Date.now();
  const circuitActive = now < clientCircuitOpenUntil && Boolean(clientCircuitReason);
  if (circuitActive) {
    lastAiError = clientCircuitReason;
  }

  if (
    !circuitActive &&
    allowAiGeneration &&
    settings.clientApiKey &&
    settings.aiEnabled
  ) {
    const aiRes = await callClaudeHaiku({
      scope: "client",
      useCatalogSystemCache: true,
      maxTokens: 550,
      temperature: 0.25,
      taskSystemInstruction: `You are ACRIO, Classic Concepts' Friendly Product Helper running on Claude Haiku 5.5.
A website visitor has typed a product search, a role introduction, a greeting, or a general message.
Write everything in simple everyday layman English. Never use em dashes ("—") or fancy buzzwords.
IMPORTANT ANTI-REPETITION & INTENT RULES:
- Do NOT mention "16,000 sq. ft. factory" unless the visitor specifically asks about our factory, manufacturing facility, or bulk capacity.
- Do NOT repeat generic lines about "custom logo, size, or LED light" on every query. Only mention custom work if they ask for customisation or if no ready item matches.
- Classify the visitor's message first:
  * "product_match": They want a product, gift, or venue setup (e.g. "gift for students", "stage podium", "hotel stands"). Pick 1 to 4 genuinely relevant slugs from Section 4.
  * "role_clarify": They ONLY state their job/role without saying what item they want (e.g. "I am an engineer", "I am a doctor", "we are architects"). Greet them, ask 1 short clarifying question tailored to their profession, and set "recommendations": [] and "highlights": [].
  * "greeting": Greeting or question about you/which AI model is used (confirm you are ACRIO powered by Claude Haiku 5.5). Set "recommendations": [] and "highlights": [].
  * "off_topic": Unrelated topic (weather, food, sports, coding, random words). Politely state that you help with Classic Concepts acrylic products and set "recommendations": [] and "highlights": [].
  * "no_match": Product request that has no matching item in Section 4. Explain honestly and set "recommendations": [] and "highlights": [].

Respond STRICTLY as a single valid JSON object (no markdown outside JSON) with this exact schema:
{
  "intent": "product_match | role_clarify | greeting | off_topic | no_match",
  "message": "Warm, natural 1-3 sentence reply tailored directly to what they typed (max 1 emoji). Zero repetitive slogans.",
  "highlights": ["0 to 2 short catalog facts specific to this query, or empty [] when clarifying/greeting/off_topic"],
  "recommendations": [
    { "slug": "exact-product-slug-from-section-4", "reason": "Short plain-English reason why this fits" }
  ],
  "suggestedLinks": [
    { "label": "Simple link label", "href": "/podiums or /shop/c/<slug> or /shop or /contact" }
  ],
  "followUpChips": ["Specific clickable follow-up 1", "Specific follow-up 2", "Specific follow-up 3"],
  "whatsappPrefill": "Simple ready-to-send WhatsApp message matching their actual request"
}`,
      userPrompt: `Customer input: "${cleanQuery}"`,
    });

    if (aiRes.ok) {
      const parsed = extractJsonObject<CachedShape>(aiRes.text);
      if (parsed && parsed.message) {
        const bySlug = new Map(snapshot.products.map((p) => [p.slug, p]));
        const intent: LocalQueryIntent =
          parsed.intent &&
          ["product_match", "role_clarify", "greeting", "off_topic", "no_match", "browse"].includes(
            parsed.intent
          )
            ? parsed.intent
            : Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
              ? "product_match"
              : "role_clarify";

        const validRecs =
          intent === "product_match"
            ? (parsed.recommendations || [])
                .filter((r) => bySlug.has(r.slug))
                .map((r) => ({
                  slug: r.slug,
                  reason: r.reason ? cleanAiPatterns(r.reason) : undefined,
                }))
            : [];

        const safeToCache: CachedShape = {
          intent,
          message: cleanAiPatterns(parsed.message),
          highlights:
            intent === "product_match" && Array.isArray(parsed.highlights)
              ? parsed.highlights.slice(0, 2).map((h) => cleanAiPatterns(h))
              : [],
          recommendations: validRecs.slice(0, 4),
          suggestedLinks: Array.isArray(parsed.suggestedLinks)
            ? parsed.suggestedLinks
                .filter((l) => l?.label && l?.href?.startsWith("/"))
                .slice(0, 3)
                .map((l) => ({ label: cleanAiPatterns(l.label), href: l.href }))
            : [{ label: "Browse All Products", href: "/shop" }],
          followUpChips: Array.isArray(parsed.followUpChips)
            ? parsed.followUpChips.slice(0, 3).map((c) => cleanAiPatterns(c))
            : [],
          whatsappPrefill: cleanAiPatterns(
            parsed.whatsappPrefill ||
              `Hi Classic Concepts! I am looking for help with: ${cleanQuery}`
          ),
          modelUsed: LOCKED_CLAUDE_MODEL,
        };

        await setCachedAiResponse(
          "concierge:v2",
          normalizedKey,
          cleanQuery,
          snapshot.catalogHash,
          safeToCache
        );

        let finalProducts = validRecs
          .map((r) => {
            const p = bySlug.get(r.slug);
            return p ? toCard(p, r.reason) : null;
          })
          .filter((x): x is ConciergeProductCard => Boolean(x));

        // Only backfill if Claude explicitly classified as product_match AND local also confirms a real product match
        if (intent === "product_match" && finalProducts.length === 0) {
          const localCheck = localSmartProductMatch(snapshot, cleanQuery, { limit: 4 });
          if (localCheck.intent === "product_match") {
            finalProducts = localCheck.products.map((p) => toCard(p));
          }
        }

        return {
          intent,
          message: safeToCache.message,
          highlights: safeToCache.highlights,
          products: finalProducts,
          suggestedLinks: safeToCache.suggestedLinks,
          followUpChips: safeToCache.followUpChips,
          whatsappNumber: snapshot.whatsappNumber,
          whatsappPrefill: safeToCache.whatsappPrefill,
          source: "ai",
          modelUsed: LOCKED_CLAUDE_MODEL,
          engineLabel: "Claude Haiku 5.5 • Live AI",
        };
      }
      lastAiError = "Claude response could not be parsed as JSON";
    } else {
      lastAiError = aiRes.error;
      if (
        lastAiError &&
        /credit balance is too low|invalid x-api-key|authentication_error/i.test(
          lastAiError
        )
      ) {
        clientCircuitOpenUntil = Date.now() + 2 * 60 * 1000;
        clientCircuitReason = lastAiError;
      }
    }
  }

  // 3. Seamless Non-Blocking Smart Local Fallback (when API key is not yet set or transient failure)
  const local = localSmartProductMatch(snapshot, cleanQuery, { limit: 4 });

  let engineLabel = "Local Catalog Match";
  let aiDiagnostic: string | undefined;
  if (!settings.clientApiKey) {
    engineLabel = "Local Catalog Match • AI Key Not Set";
    aiDiagnostic =
      "ANTHROPIC_CLIENT_API_KEY is not configured yet. Add it in .env or Admin Settings to enable live Claude Haiku 5.5 replies.";
  } else if (!settings.aiEnabled) {
    engineLabel = "Local Catalog Match • AI Paused";
    aiDiagnostic = "AI responses are currently paused in Admin Settings.";
  } else if (lastAiError && /credit balance is too low/i.test(lastAiError)) {
    engineLabel = "Local Catalog Match • AI Credits Exhausted";
    aiDiagnostic = `Anthropic billing notice: ${lastAiError}`;
  } else if (
    lastAiError &&
    /invalid x-api-key|authentication_error/i.test(lastAiError)
  ) {
    engineLabel = "Local Catalog Match • Invalid AI Key";
    aiDiagnostic = `Anthropic API key error: ${lastAiError}`;
  } else if (!allowAiGeneration) {
    engineLabel = "Local Catalog Match • Rate Limit";
    aiDiagnostic = "Per-visitor live AI budget reached; switched to instant catalog match.";
  } else if (lastAiError) {
    engineLabel = "Local Catalog Match • AI Fallback";
    aiDiagnostic = `Claude Haiku 5.5 error: ${lastAiError}`;
  }

  const askedWhichAi = /\b(which ai|what ai|what model|which model)\b/i.test(cleanQuery);
  const message =
    askedWhichAi && engineLabel.startsWith("Local Catalog Match")
      ? `ACRIO is configured for Claude Haiku 5.5, and right now it is answering in ${engineLabel} mode.`
      : local.advisoryMessage;

  return {
    intent: local.intent,
    message,
    highlights: local.highlights,
    products: local.products.map((p) => toCard(p)),
    suggestedLinks: local.suggestedLinks,
    followUpChips: local.followUpChips,
    whatsappNumber: snapshot.whatsappNumber,
    whatsappPrefill: local.whatsappPrefill,
    source: "smart-local",
    modelUsed: "local-catalog",
    engineLabel,
    aiDiagnostic,
  };
}

/**
 * AI + Lexical Smart Search for Search Bars (/shop, /podiums, Category grids, Global Ctrl+K).
 * Never blocks if AI credentials aren't configured.
 */
export async function runSmartCatalogSearch(
  rawQuery: string,
  options?: {
    onlyPodiums?: boolean;
    categorySlug?: string;
    useAi?: boolean;
    limit?: number;
  }
): Promise<{
  intent: LocalQueryIntent;
  products: ConciergeProductCard[];
  summary: string | null;
  matchedCategories: { name: string; slug: string; href: string }[];
  source: "ai" | "cache" | "smart-local";
  modelUsed: string;
  engineLabel: string;
}> {
  const snapshot = await getKnowledgeSnapshot();
  const settings = await getAiRuntimeSettings();
  const cleanQuery = (rawQuery || "").trim().slice(0, 300);
  const limit = options?.limit ?? 12;

  const localResult = localSmartProductMatch(snapshot, cleanQuery, {
    limit,
    onlyPodiums: options?.onlyPodiums,
    categorySlug: options?.categorySlug,
  });

  const localEngineLabel = !settings.clientApiKey
    ? "Local Catalog Match • AI Key Not Set"
    : !settings.aiEnabled
      ? "Local Catalog Match • AI Paused"
      : "Local Catalog Match";

  // For role introductions, greetings, or obvious off-topic inputs when typing in instant search, return cleanly with 0 products
  if (
    localResult.intent === "role_clarify" ||
    localResult.intent === "greeting" ||
    localResult.intent === "off_topic"
  ) {
    if (!options?.useAi) {
      return {
        intent: localResult.intent,
        products: [],
        summary: localResult.advisoryMessage,
        matchedCategories: [],
        source: "smart-local",
        modelUsed: "local-catalog",
        engineLabel: localEngineLabel,
      };
    }
  }

  // For empty or 1-word exact SKU/keyword queries when useAi isn't explicitly requested, local match is instant (<1ms)
  const wordCount = cleanQuery.split(/\s+/).filter(Boolean).length;
  const shouldUseAi =
    Boolean(cleanQuery) &&
    (options?.useAi === true || (wordCount >= 2 && localResult.products.length <= 2));

  if (!shouldUseAi) {
    return {
      intent: localResult.intent,
      products: localResult.products.map((p) => toCard(p)),
      summary: cleanQuery ? localResult.advisoryMessage : null,
      matchedCategories: localResult.matchedCategories,
      source: "smart-local",
      modelUsed: "local-catalog",
      engineLabel: localEngineLabel,
    };
  }

  const scopePrefix = `search:v2:${options?.onlyPodiums ? "podiums" : "all"}:${options?.categorySlug || "any"}`;
  const normalizedKey = normalizeQueryForCache(cleanQuery);

  type SearchCachedShape = {
    intent?: LocalQueryIntent;
    summary: string;
    matches: { slug: string; reason?: string }[];
  };

  const cached = await getCachedAiResponse<SearchCachedShape>(
    scopePrefix,
    normalizedKey,
    snapshot.catalogHash
  );

  const bySlug = new Map(snapshot.products.map((p) => [p.slug, p]));

  if (cached) {
    const cards = (cached.matches || [])
      .map((m) => {
        const p = bySlug.get(m.slug);
        if (!p) return null;
        if (options?.onlyPodiums && !p.isPodium) return null;
        if (
          options?.categorySlug &&
          p.categorySlug !== options.categorySlug &&
          p.subCategorySlug !== options.categorySlug
        ) {
          return null;
        }
        return toCard(p, m.reason ? cleanAiPatterns(m.reason) : undefined);
      })
      .filter((x): x is ConciergeProductCard => Boolean(x));

    const cachedIntent = cached.intent || (cards.length > 0 ? "product_match" : "no_match");
    return {
      intent: cachedIntent,
      products: cards,
      summary: cached.summary ? cleanAiPatterns(cached.summary) : null,
      matchedCategories: cards.length > 0 ? localResult.matchedCategories : [],
      source: "cache",
      modelUsed: LOCKED_CLAUDE_MODEL,
      engineLabel: "Claude Haiku 5.5 • Instant Cache",
    };
  }

  if (settings.clientApiKey && settings.aiEnabled) {
    const aiRes = await callClaudeHaiku({
      scope: "client",
      useCatalogSystemCache: true,
      maxTokens: 450,
      temperature: 0.15,
      taskSystemInstruction: `You are ACRIO, Classic Concepts' Product Search Helper running on Claude Haiku 5.5.
Given a visitor's search query${options?.onlyPodiums ? " (restricted ONLY to Podiums)" : ""}${
        options?.categorySlug ? ` (within category "${options.categorySlug}")` : ""
      }, write in plain everyday English (no em dashes, no "16,000 sq. ft." or generic customisation slogans) and return STRICTLY valid JSON:
{
  "intent": "product_match | role_clarify | greeting | off_topic | no_match",
  "summary": "One short, natural sentence answering or explaining what matches their query.",
  "matches": [
    { "slug": "exact-slug-from-section-4", "reason": "Short 5-8 word everyday reason" }
  ]
}
If the input is a role introduction ("I am an engineer"), greeting, or off-topic query, set "matches": [] and write a polite clarifying or helpful summary. Otherwise select up to ${Math.min(limit, 8)} best-matching slugs from Section 4.`,
      userPrompt: `Search query: "${cleanQuery}"`,
    });

    if (aiRes.ok) {
      const parsed = extractJsonObject<SearchCachedShape>(aiRes.text);
      if (parsed && Array.isArray(parsed.matches)) {
        const intent: LocalQueryIntent =
          parsed.intent &&
          ["product_match", "role_clarify", "greeting", "off_topic", "no_match"].includes(
            parsed.intent
          )
            ? parsed.intent
            : parsed.matches.length > 0
              ? "product_match"
              : "no_match";

        const validMatches =
          intent === "product_match"
            ? parsed.matches
                .filter((m) => bySlug.has(m.slug))
                .map((m) => ({
                  slug: m.slug,
                  reason: m.reason ? cleanAiPatterns(m.reason) : undefined,
                }))
            : [];

        const cleanSummary = parsed.summary ? cleanAiPatterns(parsed.summary) : "";
        await setCachedAiResponse(
          scopePrefix,
          normalizedKey,
          cleanQuery,
          snapshot.catalogHash,
          { intent, summary: cleanSummary, matches: validMatches }
        );

        const aiCards = validMatches
          .map((m) => {
            const p = bySlug.get(m.slug)!;
            if (options?.onlyPodiums && !p.isPodium) return null;
            return toCard(p, m.reason);
          })
          .filter((x): x is ConciergeProductCard => Boolean(x));

        // Merge strong lexical matches ONLY when intent is product_match
        if (intent === "product_match" && localResult.intent === "product_match") {
          const seen = new Set(aiCards.map((c) => c.slug));
          for (const lp of localResult.products) {
            if (!seen.has(lp.slug) && aiCards.length < limit) {
              aiCards.push(toCard(lp));
              seen.add(lp.slug);
            }
          }
        }

        return {
          intent,
          products: aiCards,
          summary: cleanSummary || localResult.advisoryMessage,
          matchedCategories: aiCards.length > 0 ? localResult.matchedCategories : [],
          source: "ai",
          modelUsed: LOCKED_CLAUDE_MODEL,
          engineLabel: "Claude Haiku 5.5 • Live AI",
        };
      }
    }
  }

  return {
    intent: localResult.intent,
    products: localResult.products.map((p) => toCard(p)),
    summary: localResult.advisoryMessage,
    matchedCategories: localResult.matchedCategories,
    source: "smart-local",
    modelUsed: "local-catalog",
    engineLabel: localEngineLabel,
  };
}

/**
 * Admin AI Co-Pilot Tasks:
 * - inline_rewrite: Polish, shorten, convert to bullet points, or generate copy from custom prompt
 * - product_autofill: Generate structured bullet description, key features, dimensions, specs & note
 * - bulletize_product: Convert a product's prose description into high-converting bullet points
 * - draft_enquiry_reply: Draft personalized email/WhatsApp response for customer enquiry
 */
export async function runAdminInlineRewrite(params: {
  currentText: string;
  instruction: string;
  mode: "plain" | "html" | "bullets";
  fieldLabel?: string;
}): Promise<{ ok: boolean; result: string; bullets?: string[]; warning?: string; error?: string }> {
  const { currentText, instruction, mode, fieldLabel } = params;

  const aiRes = await callClaudeHaiku({
    scope: "admin",
    useCatalogSystemCache: true,
    maxTokens: 700,
    temperature: 0.35,
    taskSystemInstruction: `You are Classic Concepts' Plain-Language Website Writer & Brand Design Editor.
Rewrite or generate content for the website element "${fieldLabel || "Website Copy"}".
IMPORTANT: Write in simple, everyday layman English that any normal customer understands on the first read. Never use em dashes ("—"), spaced en dashes (" – "), or fancy AI words (bespoke, elevate, meticulous, seamless, unparalleled, state-of-the-art, cutting-edge, optical-grade, utilize).
Output format required: ${
      mode === "bullets"
        ? 'STRICT JSON object: { "bullets": ["Material: Simple clear point 1", "Build & Finish: Simple clear point 2", ...] } (4 to 6 short, easy-to-understand bullet points, zero long paragraphs).'
        : mode === "html"
        ? `Clean semantic HTML fragment ONLY (NO <html>/<body>/<script> tags, NO markdown code fences).
CRITICAL DESIGN-LANGUAGE RULE: If the Current content contains formatting tags such as <strong>, <b>, <em>, <br>, <span class="...">, or <span style="color:... / background:... / font-weight:..."> (including Classic Concepts brand colors like #0056b3 royal blue, #e31837 crimson red, #3b82f6 sky blue, or gradient text spans), YOU MUST RETAIN and carry over those exact classes, inline color/gradient styles, bold highlights, and line-break rhythm onto the corresponding key words/phrases in your rewritten output.`
        : "Clean plain text ONLY (no HTML tags, no surrounding quotes, no markdown fences, no preamble)."
    }`,
    userPrompt: `Current content:\n${currentText || "(empty)"}\n\nAdmin instruction:\n${
      instruction || "Rewrite in clear, friendly, everyday English for Classic Concepts without fancy words or em dashes."
    }`,
  });

  if (aiRes.ok && aiRes.text) {
    if (mode === "bullets") {
      const parsed = extractJsonObject<{ bullets: string[] }>(aiRes.text);
      const rawList =
        parsed?.bullets && Array.isArray(parsed.bullets) && parsed.bullets.length > 0
          ? parsed.bullets
          : extractBulletsFromContent(aiRes.text);
      const list = rawList.map((b) => cleanAiPatterns(b)).filter(Boolean);
      return {
        ok: true,
        bullets: list,
        result: bulletsToCleanHtml(list),
      };
    }

    const cleaned = cleanAiPatterns(
      aiRes.text
        .replace(/^```(?:html|text)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .replace(/^["']|["']$/g, "")
        .trim(),
      mode === "html"
    );
    return { ok: true, result: cleaned };
  }

  // Non-blocking deterministic fallback for bullet conversion when AI key isn't set yet!
  if (mode === "bullets" && currentText.trim()) {
    const localBullets = extractBulletsFromContent(currentText).map((b) => cleanAiPatterns(b));
    return {
      ok: true,
      bullets: localBullets,
      result: bulletsToCleanHtml(localBullets),
      warning:
        aiRes.error ||
        "Formatted into bullet points locally (add your Admin API key in Site Settings for AI suggestions).",
    };
  }

  return {
    ok: false,
    result: currentText,
    error:
      aiRes.error ||
      "AI credentials are not configured yet. Add your Anthropic API key in Admin -> Site Settings.",
  };
}

export async function runAdminProductAutofill(params: {
  name: string;
  categoryName?: string;
  isPodium?: boolean;
  sku?: string;
  existingDescription?: string;
  existingSpecs?: { name: string; value: string; type: string }[];
  customNotes?: string;
}): Promise<{
  ok: boolean;
  data?: {
    bullets: string[];
    descriptionHtml: string;
    shortBulletSummary: string;
    features: string[];
    dimensions: { name: string; value: string }[];
    specifications: { name: string; value: string }[];
    importantNoteHtml: string;
    discountBadge?: string;
    suggestedIndustries?: string[];
    suggestedProblems?: string[];
  };
  error?: string;
}> {
  if (!params.name?.trim()) {
    return { ok: false, error: "Please enter a product name first." };
  }

  const aiRes = await callClaudeHaiku({
    scope: "admin",
    useCatalogSystemCache: true,
    maxTokens: 950,
    temperature: 0.25,
    taskSystemInstruction: `You are Classic Concepts' Plain-Language Product Specialist.
Generate accurate, easy-to-understand product details for an acrylic item made by Classic Concepts.
CRITICAL RULES:
- Write in simple everyday layman English that a first-time buyer immediately understands.
- NEVER use em dashes ("—") or fancy words like bespoke, optical-grade, elevate, meticulous, seamless, or state-of-the-art.
- Product descriptions MUST be short, clear bullet points (never long paragraphs).
Return STRICTLY valid JSON matching this schema:
{
  "bullets": [
    "Material: Made from thick, glass-clear imported acrylic that does not turn yellow.",
    "Build & Finish: Smooth, shiny polished edges with a strong, steady body.",
    "Easy to Use: ...",
    "Custom Options: Can be custom-made in your size with your logo printed or engraved on the front.",
    "Best Used For: ..."
  ],
  "features": [
    "Simple clear key feature 1",
    "Simple clear key feature 2",
    "Simple clear key feature 3",
    "Simple clear key feature 4",
    "Simple clear key feature 5"
  ],
  "dimensions": [
    { "name": "Overall Height", "value": "e.g. 44\" to 46\" (Custom sizes available)" },
    { "name": "Top / Surface Size", "value": "..." },
    { "name": "Sheet Thickness", "value": "..." }
  ],
  "specifications": [
    { "name": "Material", "value": "Thick, Glass-Clear Imported Cast Acrylic (Non-Yellowing)" },
    { "name": "Edge Finish", "value": "Smooth, Shiny Polished Edges" },
    { "name": "Logo Option", "value": "Color Printed or Laser Engraved Logo Available" },
    { "name": "Made By", "value": "Classic Concepts Factory, India" }
  ],
  "importantNoteHtml": "<ul><li>Easy Cleaning: Wipe gently with a soft cloth and mild soapy water. Do not use harsh glass sprays, thinner, or alcohol cleaners.</li><li>Custom Orders: Custom sizes, LED light bases, and front logo printing are available on request.</li></ul>",
  "suggestedIndustries": ["Exact Industry Name from Section 3 if applicable"],
  "suggestedProblems": ["Exact Problem Statement Name from Section 3 if applicable"]
}
If existing specs or dimensions are provided in the prompt, keep those exact measurements rather than inventing conflicting numbers.`,
    userPrompt: `Product Name: ${params.name}
Category: ${params.categoryName || (params.isPodium ? "Acrylic Podiums" : "Acrylic Products")}
Is Podium: ${params.isPodium ? "Yes" : "No"}
SKU: ${params.sku || "N/A"}
Existing Description/Notes: ${params.existingDescription || "None"}
Existing Specs: ${JSON.stringify(params.existingSpecs || [])}
Admin Prompt / Notes: ${params.customNotes || "Generate simple layman bullet-point description, key features, dimensions, and specs."}`,
  });

  if (!aiRes.ok) {
    return { ok: false, error: aiRes.error };
  }

  const parsed = extractJsonObject<{
    bullets?: string[];
    features?: string[];
    dimensions?: { name: string; value: string }[];
    specifications?: { name: string; value: string }[];
    importantNoteHtml?: string;
    suggestedIndustries?: string[];
    suggestedProblems?: string[];
  }>(aiRes.text);

  if (!parsed) {
    return { ok: false, error: "Could not parse AI structured product output. Please try again." };
  }

  const rawBullets =
    Array.isArray(parsed.bullets) && parsed.bullets.length > 0
      ? parsed.bullets
      : extractBulletsFromContent(params.existingDescription || params.name);
  const bullets = rawBullets.map((b) => cleanAiPatterns(b)).filter(Boolean);

  return {
    ok: true,
    data: {
      bullets,
      descriptionHtml: bulletsToCleanHtml(bullets),
      shortBulletSummary: bulletsToPlainSummary(bullets, 4),
      features: Array.isArray(parsed.features)
        ? parsed.features.filter(Boolean).map((f) => cleanAiPatterns(f))
        : [],
      dimensions: Array.isArray(parsed.dimensions)
        ? parsed.dimensions
            .filter((d) => d?.name && d?.value)
            .map((d) => ({ name: cleanAiPatterns(d.name), value: cleanAiPatterns(d.value) }))
        : [],
      specifications: Array.isArray(parsed.specifications)
        ? parsed.specifications
            .filter((s) => s?.name && s?.value)
            .map((s) => ({ name: cleanAiPatterns(s.name), value: cleanAiPatterns(s.value) }))
        : [],
      importantNoteHtml: cleanAiPatterns(
        parsed.importantNoteHtml ||
          "<ul><li>Easy Cleaning: Wipe gently with a soft cloth and mild soapy water. Do not use alcohol or harsh cleaners.</li><li>Custom Options: Custom sizes and front logo printing are available on request.</li></ul>",
        true
      ),
      suggestedIndustries: parsed.suggestedIndustries || [],
      suggestedProblems: parsed.suggestedProblems || [],
    },
  };
}

export async function runAdminDraftEnquiryReply(params: {
  customerName: string;
  customerMessage: string;
  source?: string;
  tone?: string;
}): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const aiRes = await callClaudeHaiku({
    scope: "admin",
    useCatalogSystemCache: true,
    maxTokens: 500,
    temperature: 0.3,
    taskSystemInstruction: `You are Classic Concepts' Friendly Customer Support Coordinator writing a clear, warm reply (ready for WhatsApp or Email) to a customer enquiry.
Write in simple everyday English that anyone can understand. Never use em dashes ("—") or corporate buzzwords.
Mention matching products, listed prices (if shown in Section 4, otherwise use [Confirm custom price / delivery days]), custom options (logo printing, custom sizes, LED lights), and safe delivery from our 16,000 sq. ft. factory.
Output plain text ONLY (ready to paste and send, no markdown code fences, no subject line unless requested).`,
    userPrompt: `Customer Name: ${params.customerName}
Enquiry Source: ${params.source || "Website"}
Desired Tone/Goal: ${params.tone || "Warm, simple, helpful reply with clear next steps"}
Customer Message:
"${params.customerMessage}"`,
  });

  if (!aiRes.ok) {
    return { ok: false, error: aiRes.error };
  }
  return { ok: true, reply: cleanAiPatterns(aiRes.text.trim()) };
}
