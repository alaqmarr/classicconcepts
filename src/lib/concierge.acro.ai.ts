import {
  LOCKED_CLAUDE_MODEL,
} from "@/lib/ai-agents";
import { cleanAiPatterns } from "@/lib/ai-writing-rules";
import {
  logClassicConceptsAiTrace,
  type AiTraceStep,
} from "@/lib/ai-logger";
import { isTrustedGoogleMapsUrl } from "@/lib/location-helper";
import {
  getAiRuntimeSettings,
  getKnowledgeSnapshot,
  getCachedAiResponse,
  setCachedAiResponse,
  normalizeQueryForCache,
  callClaudeHaiku,
  toCard,
  extractJsonObject,
  type ConciergeProductCard,
  type ConciergeResponse,
} from "./initialise.acro.ai";
import {
  isNonProductQueryIntent,
  deriveWebsiteConversationState,
  extractWebsiteBudgetConstraints,
  formatCandidateProductsForPrompt,
  localSmartProductMatch,
  type LocalQueryIntent,
} from "./helpers.acro.ai";

let clientCircuitOpenUntil = 0;
let clientCircuitReason = "";

export interface ConciergeHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

function extractOrderIdCandidateFromText(input: string): string | null {
  const m =
    input.match(
      /\b((?:CC|CE53|CE)-[A-Z0-9-]{3,20})\b/i
    ) ||
    input.match(
      /\b(?:order|tracking)\s*(?:id|no|number|#)?\s*[:#-]?\s*([A-Z0-9-]{5,24})\b/i
    );
  return m?.[1] ? m[1].trim() : null;
}

/**
 * Customer Concierge: Understands even vague user descriptions ("we run a hotel", "college stage",
 * "jewellery shop", "need 50 awards"), keeps multi-turn conversations open with full memory,
 * and checks live order tracking across Classic Concepts (:3003) and WhatsApp Hub (:3007).
 */
export async function runCustomerConcierge(
  rawQuery: string,
  allowAiGeneration = true,
  history?: ConciergeHistoryTurn[]
): Promise<ConciergeResponse> {
  const startedAt = Date.now();
  const steps: AiTraceStep[] = [];
  const pushStep = (
    label: string,
    detail?: string,
    status: AiTraceStep["status"] = "OK"
  ) => {
    steps.push({
      stepNumber: steps.length + 1,
      label,
      detail,
      durationMs: Date.now() - startedAt,
      status,
    });
  };

  const snapshot = await getKnowledgeSnapshot();
  const settings = await getAiRuntimeSettings();
  const cleanQuery = (rawQuery || "").trim().slice(0, 500);
  const cleanHistory = Array.isArray(history)
    ? history
        .filter(
          (h) =>
            (h?.role === "user" || h?.role === "assistant") &&
            typeof h?.text === "string" &&
            h.text.trim().length > 0
        )
        .slice(-10)
        .map((h) => ({
          role: h.role,
          text: h.text.trim().slice(0, 500),
        }))
    : [];
  const hasConversationContext = cleanHistory.length > 0;

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

  pushStep(
    "Loaded Classic Concepts knowledge snapshot",
    `catalogCount=${snapshot.products.length}, historyTurns=${cleanHistory.length}`
  );

  // 0. Live Order ID Lookup (0 AI credits, instant database + :3007/:3000 tracking check)
  const orderIdCandidate = extractOrderIdCandidateFromText(cleanQuery);
  if (orderIdCandidate) {
    const hubCandidates = Array.from(
      new Set(
        [
          process.env.CCWHATSAPP_INTERNAL_URL,
          "http://127.0.0.1:3007",
          "http://127.0.0.1:3000",
        ]
          .filter(Boolean)
          .map((u) => String(u).replace(/\/+$/, ""))
      )
    );
    for (const hubBase of hubCandidates) {
      try {
        const trackRes = await fetch(
          `${hubBase}/api/tracking/lookup?id=${encodeURIComponent(orderIdCandidate)}&brand=CLASSIC_CONCEPTS`,
          { signal: AbortSignal.timeout(3000) }
        ).catch(() => null);
        if (trackRes?.ok) {
          const trackJson: any = await trackRes.json().catch(() => null);
          if (trackJson?.ok && trackJson?.tracking) {
            const t = trackJson.tracking;
            const statusFriendly = String(t.shipmentStatus || "IN_PRODUCTION").replace(/_/g, " ");
            const msg = cleanAiPatterns(
              `Order ${t.orderId} (${t.brandLabel || "Classic Concepts"}) is currently ${statusFriendly}.${
                t.itemsSummary ? ` Items: ${t.itemsSummary}.` : ""
              }${
                t.awbNumber ? ` Courier: ${t.providerName || "Partner"} (AWB ${t.awbNumber}).` : ""
              }`
            );
            pushStep("Resolved live order tracking", `orderId=${t.orderId}, status=${statusFriendly}`);
            logClassicConceptsAiTrace({
              feature: "Website Concierge (Order Lookup)",
              actor: "Website Visitor",
              question: cleanQuery,
              model: "order-db-lookup",
              outcomeSource: "ORDER_LOOKUP",
              responseCacheStatus: "BYPASS",
              catalogCacheStatus: "HIT",
              cacheDetails: "Live order ID lookup bypassed LLM call (0 AI credits)",
              productLookupTriggered: false,
              productLookupQuery: orderIdCandidate,
              productLookupTotalScanned: 0,
              productsLookedUp: [],
              steps,
              response: msg,
              durationMs: Date.now() - startedAt,
            });
            return {
              intent: "browse",
              message: msg,
              highlights: [
                `Status: ${statusFriendly}`,
                ...(t.estimatedDelivery ? [`Estimated delivery: ${t.estimatedDelivery}`] : []),
              ],
              products: [],
              suggestedLinks: [
                { label: `Track ${t.orderId}`, href: `/tracking?id=${encodeURIComponent(t.orderId)}` },
                { label: "Contact Support", href: "/contact" },
              ],
              followUpChips: [
                "Check another order ID",
                "Browse clear stage podiums",
                "Ask about custom fabrication",
              ],
              whatsappNumber: snapshot.whatsappNumber,
              whatsappPrefill: `Hi Classic Concepts, I am checking order ${t.orderId}.`,
              source: "smart-local",
              modelUsed: "order-db-lookup",
              engineLabel: "Live Order Lookup",
            };
          }
        }
      } catch {
        // Try next Hub candidate
      }
    }
  }

  const normalizedKey = hasConversationContext
    ? ""
    : normalizeQueryForCache(cleanQuery);

  // 1. Check Persistent Response Cache FIRST for single-turn queries (0 AI credits!)
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

  const cached = !hasConversationContext
    ? await getCachedAiResponse<CachedShape>(
        "concierge:v4",
        normalizedKey,
        snapshot.catalogHash
      )
    : null;

  if (cached) {
    const bySlug = new Map(snapshot.products.map((p) => [p.slug, p]));
    const hydrated = (cached.recommendations || [])
      .map((r) => {
        const prod = bySlug.get(r.slug);
        return prod ? toCard(prod, r.reason ? cleanAiPatterns(r.reason) : undefined) : null;
      })
      .filter((x): x is ConciergeProductCard => Boolean(x));

    const cachedIntent =
      cached.intent || (hydrated.length > 0 ? "product_match" : "role_clarify");
    const nonProductCached = isNonProductQueryIntent(cachedIntent);
    const cachedIsLocationAsk =
      cachedIntent === "company_info" &&
      /\b(where|location|address|map|directions?|visit|office|factory|workshop)\b/i.test(
        cleanQuery
      );
    let cleanMsg = cleanAiPatterns(cached.message);
    if (
      cachedIsLocationAsk &&
      !/maps\.google\.com|google\.com\/maps|maps\.app\.goo\.gl/i.test(cleanMsg)
    ) {
      cleanMsg = `${cleanMsg} Google Maps: ${snapshot.mapsUrl}`;
    }
    const cachedLinks = [...(cached.suggestedLinks || [{ label: "Browse Full Catalog", href: "/shop" }])];
    if (
      cachedIsLocationAsk &&
      !cachedLinks.some((l) => isTrustedGoogleMapsUrl(l.href))
    ) {
      cachedLinks.unshift({ label: "Open in Google Maps", href: snapshot.mapsUrl });
    }
    pushStep(
      "Served response from concierge:v4 persistent cache",
      `key="${normalizedKey}", intent=${cachedIntent}, matchedProducts=${hydrated.length}`
    );
    logClassicConceptsAiTrace({
      feature: "Website Customer Concierge",
      actor: "Website Visitor",
      question: cleanQuery,
      model: cached.modelUsed || LOCKED_CLAUDE_MODEL,
      effort: "medium",
      outcomeSource: "RESPONSE_CACHE",
      responseCacheStatus: "HIT",
      catalogCacheStatus: nonProductCached ? "BYPASS" : "HIT",
      cacheDetails: `concierge:v4 HIT (intent=${cachedIntent}, catalogHash=${snapshot.catalogHash.slice(0, 8)})`,
      productLookupTriggered: !nonProductCached,
      productLookupQuery: nonProductCached ? "" : cleanQuery,
      productLookupTotalScanned: nonProductCached ? 0 : snapshot.products.length,
      productsLookedUp: nonProductCached
        ? []
        : hydrated.map((p) => ({
            name: p.name,
            slug: p.slug,
            sku: p.sku,
            brand: "CLASSIC_CONCEPTS",
            priceInr: p.effectivePrice,
            url: `/shop/${p.slug}`,
            reason: p.reason || null,
          })),
      steps,
      response: cleanMsg,
      durationMs: Date.now() - startedAt,
    });

    return {
      intent: cachedIntent,
      message: cleanMsg,
      highlights: (cached.highlights || []).map((h) => cleanAiPatterns(h)),
      products: nonProductCached ? [] : hydrated,
      suggestedLinks: cachedLinks.slice(0, 3),
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

  // Pre-classify current message intent BEFORE invoking Claude or scanning catalog products (Phase A + Phase B multi-turn state + Phase H deep retrieval)
  const webState = deriveWebsiteConversationState(cleanHistory, cleanQuery);
  const directPreCheck = localSmartProductMatch(snapshot, cleanQuery, { limit: 12 });
  const preCheck =
    !isNonProductQueryIntent(directPreCheck.intent) && webState.isFollowUpRefinement
      ? localSmartProductMatch(snapshot, webState.effectiveSearchQuery, {
          limit: 12,
          onlyPodiums: webState.onlyPodiums,
          maxPrice: webState.maxPrice,
          minPrice: webState.minPrice,
          preferPremium: webState.preferences.includes("premium"),
        })
      : !isNonProductQueryIntent(directPreCheck.intent) &&
        (webState.maxPrice !== null ||
          webState.minPrice !== null ||
          webState.preferences.includes("premium"))
      ? localSmartProductMatch(snapshot, cleanQuery, {
          limit: 12,
          onlyPodiums: webState.onlyPodiums,
          maxPrice: webState.maxPrice,
          minPrice: webState.minPrice,
          preferPremium: webState.preferences.includes("premium"),
        })
      : directPreCheck;

  if (
    !isNonProductQueryIntent(preCheck.intent) &&
    preCheck.products.length > 0 &&
    webState.isFollowUpRefinement
  ) {
    const { buildDeterministicDeepProductAdvisory } = await import(
      "@/lib/product-knowledge"
    );
    const followUpDeep = buildDeterministicDeepProductAdvisory({
      rawQuery: cleanQuery,
      matchedProducts: preCheck.products,
    });
    if (followUpDeep.advisoryMessage) {
      preCheck.advisoryMessage = followUpDeep.advisoryMessage;
    }
    if (followUpDeep.highlights.length > 0) {
      preCheck.highlights = followUpDeep.highlights;
    }
  }
  const preClassifiedNonProduct = isNonProductQueryIntent(preCheck.intent);
  const activeBudgetLabel =
    webState.maxPrice !== null && webState.minPrice !== null
      ? `₹${webState.minPrice.toLocaleString("en-IN")} to ₹${webState.maxPrice.toLocaleString("en-IN")}`
      : webState.maxPrice !== null
      ? `<= ₹${webState.maxPrice.toLocaleString("en-IN")}`
      : webState.minPrice !== null
      ? `>= ₹${webState.minPrice.toLocaleString("en-IN")}`
      : null;

  pushStep(
    "Classified visitor turn intent & state",
    `preIntent=${preCheck.intent}, requiresProductLookup=${!preClassifiedNonProduct}, effectiveQuery="${webState.effectiveSearchQuery}"${activeBudgetLabel ? `, budget="${activeBudgetLabel}"` : ""}`
  );

  pushStep(
    hasConversationContext
      ? "Multi-turn context present -> bypassed single-turn response cache"
      : "Response cache MISS -> invoking claude-haiku-5-5"
  );

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
    const claudeTurns: { role: "user" | "assistant"; content: string }[] = [];
    for (const h of cleanHistory) {
      const prev = claudeTurns[claudeTurns.length - 1];
      if (prev && prev.role === h.role) {
        prev.content = `${prev.content}\n${h.text}`;
      } else {
        claudeTurns.push({ role: h.role, content: h.text });
      }
    }
    while (claudeTurns.length > 0 && claudeTurns[0].role !== "user") {
      claudeTurns.shift();
    }
    const stateHint =
      hasConversationContext && !preClassifiedNonProduct && webState.primaryProductQuery
        ? ` Active visitor requirements from conversation: product="${webState.primaryProductQuery}"${activeBudgetLabel ? `, budget="${activeBudgetLabel}"` : ""}${webState.preferences.length ? `, preferences=[${webState.preferences.join(", ")}]` : ""}. Preserve the product category and enforce the active budget ceiling strictly.`
        : "";
    const candidateProductsBlock = !preClassifiedNonProduct
      ? `\n\n${formatCandidateProductsForPrompt(preCheck.products, 15, cleanQuery)}`
      : "";
    const finalUserMsg = hasConversationContext
      ? `[Continue the open conversation naturally. Do NOT repeat "Hello" or "Welcome" again; answer or narrow down based on our earlier messages above.${stateHint}${preClassifiedNonProduct ? ` Detected non-product intent="${preCheck.intent}": answer directly and set "recommendations": [] without repeating earlier products!` : ""}]\nVisitor follow-up: "${cleanQuery}"${candidateProductsBlock}`
      : `Customer input: "${cleanQuery}"${candidateProductsBlock}`;
    // Preserve multi-turn history across all turns so numbered selections ("1"), chat history summaries, and follow-ups work seamlessly
    if (claudeTurns.length > 0 && claudeTurns[claudeTurns.length - 1].role === "user") {
      claudeTurns[claudeTurns.length - 1].content = `${claudeTurns[claudeTurns.length - 1].content}\n\n${finalUserMsg}`;
    } else {
      claudeTurns.push({ role: "user", content: finalUserMsg });
    }

    const aiRes = await callClaudeHaiku({
      scope: "client",
      useCatalogSystemCache: true,
      effort: preClassifiedNonProduct ? "low" : "medium",
      maxTokens: 4096,
      temperature: 0.25,
      conversationMessages: claudeTurns,
      taskSystemInstruction: `You are ACRIO, Classic Concepts' Friendly Product Helper & Project Specialist.
A website visitor is chatting with you inside our search & concierge modal.
Write everything in simple everyday layman English (or Hindi/Hinglish if the visitor writes in Hindi/Hinglish; use other languages only if they clearly do not understand English or Hindi). Never use em dashes ("—") or fancy buzzwords.
CONVERSATION CONTINUITY, GIST FORMATTING, TOTALLING & LEADERSHIP CONTACTS:
- Keep the conversation open and helpful! If the visitor gives a short or numbered reply ("1", "any more options?", "cheaper alternative", "they sit, Acrylic chair"), use the conversation history above to understand what they mean.
- Cheapest vs Most Premium Podiums: Our most affordable ready podium is Acrylic Podium CCP057S (₹7,150, Top 18" x 14") followed by CCP054 (₹14,999, Top 20" x 15"). Our most premium flagship podium is Acrylic & Wood Podium CCP111 (₹55,000, Top 27" x 18").
- Podium Sub-Categories: 1. Essential Podiums (₹7,150 to ₹23,650), 2. Classic Signature Podiums (₹19,250 to ₹28,600), 3. Premium Podiums (₹28,600 to ₹55,000), 4. Custom-Built Podiums.
- Furniture & Chairs: When asked about furniture, interiors, or chairs for sitting, recommend our Acrylic Chair (₹15,950), Acrylic Bar Stool (₹9,350), Acrylic Console Table (₹12,100), and Acrylic Nesting Tables (₹8,800) — never suggest podiums for furniture/seating!
- Multi-Item Totalling & Budgets: When the visitor asks for multiple quantities or a project budget (e.g. "3 podiums, 10 signages, and 10 chairs within 1 lac rupees"), calculate unit price × quantity = line total for each item and suggest a within-budget combination!
- Company Details, Leadership & Department Contacts: ONLY when the visitor explicitly asks about company leadership, directors, sales contacts, or factory address, share the verified names, roles, emails, and phone numbers from Section 3 (Directors: Yusuf Zakir - Director Production, Hussain Earanpurwala - Director Sales; Corporate & Sales Managers: Shiva Kumar Chernapally, Lalitha Barma, Susheela Kunchala, Shilpa Parikh, M Chandi Priyanka, Lakshmi Nossam, Syed Murtuza, B Suraj Goud, Harendar Kumar; Head Office: +91 79016 50662 / +91 79016 50663, Official WhatsApp: +91 73372 20568, sales@classicconcepts.in, ${snapshot.address}, Google Maps: ${snapshot.mapsUrl}). When asked for factory location, address, or directions, always include the Google Maps link in your message and include { "label": "Open in Google Maps", "href": "${snapshot.mapsUrl}" } in "suggestedLinks". Never include unrequested contact directories in normal product answers!
- When the visitor asks about a single product, give a concise 2 to 4 line gist instead of a wall of text.
- Never push or market products on greetings, intros, company info, topic resets, or off-topic turns. Reply politely in 1 to 2 short, direct sentences and stop.
- Never repeat "Hello" or "Welcome" on follow-up turns, and do not repeat the same closing question turn after turn.
- Classify the visitor's message:
  * "product_match": They want a product, gift, or venue setup (or are refining an earlier product request). Pick 1 to 4 genuinely relevant slugs from Section 4.
  * "role_clarify": They ONLY state their job/role or a vague problem without saying what item they want. Ask 1 short, friendly clarifying question and set "recommendations": [] and "highlights": [].
  * "greeting": Greeting or question about you (confirm you are ACRIO, Classic Concepts' product assistant). Set "recommendations": [] and "highlights": [].
  * "company_info": Question about our factory location, leadership/department contacts, working hours, pan-India shipping, or what Classic Concepts does. Answer clearly and set "recommendations": [] and "highlights": [].
  * "topic_reset": They say "I have a different query" or "Let's start over". Invite their new question warmly and set "recommendations": [] and "highlights": [] (do NOT repeat products from earlier turns).
  * "human_handoff_info": They ask "Whom will you connect me to?". Explain that we connect them to our Classic Concepts Sales & Fabrication Team on WhatsApp, and set "recommendations": [] and "highlights": [].
  * "off_topic": Unrelated topic (weather, food, sports, coding). Politely state that you help with Classic Concepts acrylic products and set "recommendations": [] and "highlights": [].
  * "no_match": Product request that has no matching item in Section 4. Explain honestly, offer custom size options if acrylic-related, and set "recommendations": [] and "highlights": [].

Respond STRICTLY as a single valid JSON object (no markdown outside JSON) with this exact schema:
{
  "intent": "product_match | role_clarify | greeting | company_info | topic_reset | human_handoff_info | off_topic | no_match",
  "message": "Warm, natural 1-3 sentence reply tailored directly to what they typed (max 1 emoji). Zero repetitive slogans.",
  "highlights": ["0 to 2 short catalog facts specific to this query, or empty [] when clarifying/greeting/off_topic"],
  "recommendations": [
    { "slug": "exact-product-slug-from-section-4", "reason": "Short plain-English reason why this fits" }
  ],
  "suggestedLinks": [
    { "label": "Simple link label", "href": "/podiums or /shop/c/<slug> or /shop or /contact or ${snapshot.mapsUrl}" }
  ],
  "followUpChips": ["Specific clickable follow-up 1", "Specific follow-up 2", "Specific follow-up 3"],
  "whatsappPrefill": "Simple ready-to-send WhatsApp message matching their actual request"
}`,
      userPrompt: finalUserMsg,
    });

    if (aiRes.ok) {
      const parsed = extractJsonObject<CachedShape>(aiRes.text);
      if (parsed && parsed.message) {
        const bySlug = new Map(snapshot.products.map((p) => [p.slug, p]));
        const intent: LocalQueryIntent = preClassifiedNonProduct
          ? preCheck.intent
          : parsed.intent &&
              [
                "product_match",
                "role_clarify",
                "greeting",
                "company_info",
                "topic_reset",
                "human_handoff_info",
                "off_topic",
                "no_match",
                "browse",
              ].includes(parsed.intent)
            ? parsed.intent
            : Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
              ? "product_match"
              : "role_clarify";

        const isNonProd = isNonProductQueryIntent(intent);
        const validRecs =
          intent === "product_match" && !isNonProd
            ? (parsed.recommendations || [])
                .filter((r) => bySlug.has(r.slug))
                .map((r) => ({
                  slug: r.slug,
                  reason: r.reason ? cleanAiPatterns(r.reason) : undefined,
                }))
            : [];

        const isLocationAsk =
          intent === "company_info" &&
          /\b(where|location|address|map|directions?|visit|office|factory|workshop)\b/i.test(cleanQuery);
        let cleanedMessage = cleanAiPatterns(parsed.message);
        if (isLocationAsk && !/maps\.google\.com|google\.com\/maps|maps\.app\.goo\.gl/i.test(cleanedMessage)) {
          cleanedMessage = `${cleanedMessage} Google Maps: ${snapshot.mapsUrl}`;
        }
        const parsedLinks = Array.isArray(parsed.suggestedLinks)
          ? parsed.suggestedLinks
              .filter(
                (l) =>
                  Boolean(l?.label && l?.href) &&
                  (l.href.startsWith("/") || isTrustedGoogleMapsUrl(l.href))
              )
              .slice(0, 3)
              .map((l) => ({ label: cleanAiPatterns(l.label), href: l.href }))
          : [{ label: "Browse All Products", href: "/shop" }];
        if (
          isLocationAsk &&
          !parsedLinks.some((l) => isTrustedGoogleMapsUrl(l.href))
        ) {
          parsedLinks.unshift({ label: "Open in Google Maps", href: snapshot.mapsUrl });
        }

        const safeToCache: CachedShape = {
          intent,
          message: cleanedMessage,
          highlights:
            intent === "product_match" && Array.isArray(parsed.highlights)
              ? parsed.highlights.slice(0, 2).map((h) => cleanAiPatterns(h))
              : [],
          recommendations: validRecs.slice(0, 4),
          suggestedLinks: parsedLinks.slice(0, 3),
          followUpChips: Array.isArray(parsed.followUpChips)
            ? parsed.followUpChips.slice(0, 3).map((c) => cleanAiPatterns(c))
            : [],
          whatsappPrefill: cleanAiPatterns(
            intent === "human_handoff_info" && webState.primaryProductQuery
              ? `Hi Classic Concepts! Please connect me with the Sales Team regarding ${webState.primaryProductQuery}${activeBudgetLabel ? ` (budget ${activeBudgetLabel})` : ""}${webState.preferences.length ? `, preferences: ${webState.preferences.join(", ")}` : ""}.`
              : parsed.whatsappPrefill ||
                  `Hi Classic Concepts! I am looking for help with: ${cleanQuery}`
          ),
          modelUsed: LOCKED_CLAUDE_MODEL,
        };

        if (!hasConversationContext && normalizedKey) {
          await setCachedAiResponse(
            "concierge:v4",
            normalizedKey,
            cleanQuery,
            snapshot.catalogHash,
            safeToCache
          );
        }

        let finalProducts = validRecs
          .map((r) => {
            const p = bySlug.get(r.slug);
            if (!p) return null;
            if (webState.maxPrice !== null || webState.minPrice !== null) {
              if (!(typeof p.effectivePrice === "number" && p.effectivePrice > 0)) {
                return null;
              }
              if (webState.maxPrice !== null && p.effectivePrice > webState.maxPrice) {
                return null;
              }
              if (webState.minPrice !== null && p.effectivePrice < webState.minPrice) {
                return null;
              }
            }
            if (webState.onlyPodiums && !p.isPodium) {
              return null;
            }
            return toCard(p, r.reason);
          })
          .filter((x): x is ConciergeProductCard => Boolean(x));

        // Only backfill if Claude explicitly classified as product_match AND local also confirms a real product match
        if (intent === "product_match" && finalProducts.length === 0 && preCheck.intent === "product_match") {
          finalProducts = preCheck.products.slice(0, 4).map((p) => toCard(p));
        }

        pushStep(
          "Received live claude-haiku-5-5 concierge reply",
          `intent=${intent}, matchedProducts=${finalProducts.length}, inTokens=${aiRes.usage?.inputTokens || 0}, outTokens=${aiRes.usage?.outputTokens || 0}`
        );
        logClassicConceptsAiTrace({
          feature: "Website Customer Concierge",
          actor: "Website Visitor",
          question: cleanQuery,
          model: LOCKED_CLAUDE_MODEL,
          effort: "medium",
          outcomeSource: "LIVE_AI",
          responseCacheStatus: hasConversationContext ? "BYPASS" : "MISS",
          catalogCacheStatus: isNonProd ? "BYPASS" : "HIT",
          cacheDetails: hasConversationContext
            ? `Multi-turn conversation (intent=${intent})`
            : `concierge:v4 MISS -> cached (intent=${intent}, cacheRead=${aiRes.usage?.cacheReadInputTokens || 0})`,
          productLookupTriggered: !isNonProd,
          productLookupQuery: isNonProd ? "" : cleanQuery,
          productLookupTotalScanned: isNonProd ? 0 : snapshot.products.length,
          productsLookedUp: isNonProd
            ? []
            : finalProducts.map((p) => ({
                name: p.name,
                slug: p.slug,
                sku: p.sku,
                brand: "CLASSIC_CONCEPTS",
                priceInr: p.effectivePrice,
                url: `/shop/${p.slug}`,
                reason: p.reason || null,
              })),
          steps,
          response: safeToCache.message,
          durationMs: Date.now() - startedAt,
          tokenUsage: aiRes.usage || null,
        });

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
      pushStep("Claude JSON parse failed", lastAiError, "WARN");
    } else {
      lastAiError = aiRes.error;
      pushStep("Claude API call failed", lastAiError, "WARN");
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
  const local = preCheck;
  const localIsNonProd = isNonProductQueryIntent(local.intent);

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

  const message = local.advisoryMessage;

  const fallbackCards = localIsNonProd ? [] : local.products.slice(0, 4).map((p) => toCard(p));
  const contextPrefill =
    local.intent === "human_handoff_info" && webState.primaryProductQuery
      ? `Hi Classic Concepts! Please connect me with the Sales Team regarding ${webState.primaryProductQuery}${activeBudgetLabel ? ` (budget ${activeBudgetLabel})` : ""}${webState.preferences.length ? `, preferences: ${webState.preferences.join(", ")}` : ""}.`
      : local.whatsappPrefill;
  pushStep(
    "Served deterministic local catalog match fallback",
    `engine="${engineLabel}", intent=${local.intent}, matchedProducts=${fallbackCards.length}`,
    lastAiError ? "WARN" : "OK"
  );
  logClassicConceptsAiTrace({
    feature: "Website Customer Concierge",
    actor: "Website Visitor",
    question: cleanQuery,
    model: "local-catalog",
    outcomeSource: "LOCAL_FALLBACK",
    responseCacheStatus: hasConversationContext ? "BYPASS" : "MISS",
    catalogCacheStatus: localIsNonProd ? "BYPASS" : "HIT",
    cacheDetails: `${engineLabel} (intent=${local.intent})`,
    productLookupTriggered: !localIsNonProd,
    productLookupQuery: localIsNonProd ? "" : cleanQuery,
    productLookupTotalScanned: localIsNonProd ? 0 : snapshot.products.length,
    productsLookedUp: fallbackCards.map((p) => ({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      brand: "CLASSIC_CONCEPTS",
      priceInr: p.effectivePrice,
      url: `/shop/${p.slug}`,
    })),
    steps,
    response: message,
    durationMs: Date.now() - startedAt,
    error: lastAiError || aiDiagnostic || null,
  });

  return {
    intent: local.intent,
    message,
    highlights: local.highlights,
    products: fallbackCards,
    suggestedLinks: local.suggestedLinks,
    followUpChips: local.followUpChips,
    whatsappNumber: snapshot.whatsappNumber,
    whatsappPrefill: contextPrefill,
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
  const startedAt = Date.now();
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

  // For role introductions, greetings, company info, topic reset, or obvious off-topic inputs, return cleanly with 0 products and productLookupTriggered=false
  if (isNonProductQueryIntent(localResult.intent)) {
    if (cleanQuery) {
      logClassicConceptsAiTrace({
        feature: "Website Smart Search Bar",
        actor: "Website Visitor",
        question: cleanQuery,
        model: "local-catalog",
        outcomeSource: "LOCAL_FALLBACK",
        responseCacheStatus: "LOCAL_ONLY",
        catalogCacheStatus: "BYPASS",
        cacheDetails: `Skipped catalog scan for non-product intent (${localResult.intent})`,
        productLookupTriggered: false,
        productLookupQuery: "",
        productLookupTotalScanned: 0,
        productsLookedUp: [],
        steps: [
          {
            stepNumber: 1,
            label: "Classified non-product query in smart search (skipped product lookup)",
            detail: `intent=${localResult.intent}`,
            durationMs: Date.now() - startedAt,
            status: "OK",
          },
        ],
        response: localResult.advisoryMessage,
        durationMs: Date.now() - startedAt,
      });
    }
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

  // For empty or 1-word exact SKU/keyword queries when useAi isn't explicitly requested, local match is instant (<1ms)
  const wordCount = cleanQuery.split(/\s+/).filter(Boolean).length;
  const shouldUseAi =
    Boolean(cleanQuery) &&
    (options?.useAi === true || (wordCount >= 2 && localResult.products.length <= 2));

  if (!shouldUseAi) {
    const cards = localResult.products.map((p) => toCard(p));
    if (cleanQuery) {
      logClassicConceptsAiTrace({
        feature: "Website Smart Search Bar",
        actor: "Website Visitor",
        question: cleanQuery,
        model: "local-catalog",
        outcomeSource: "LOCAL_FALLBACK",
        responseCacheStatus: "LOCAL_ONLY",
        catalogCacheStatus: "HIT",
        cacheDetails: "Instant lexical catalog match (<2ms, 0 AI credits)",
        productLookupTriggered: true,
        productLookupQuery: cleanQuery,
        productLookupTotalScanned: snapshot.products.length,
        productsLookedUp: cards.map((c) => ({
          name: c.name,
          slug: c.slug,
          sku: c.sku,
          brand: "CLASSIC_CONCEPTS",
          priceInr: c.effectivePrice,
          url: `/shop/${c.slug}`,
        })),
        steps: [
          {
            stepNumber: 1,
            label: "Executed instant lexical catalog search",
            detail: `matched=${cards.length} of ${snapshot.products.length}`,
            durationMs: Date.now() - startedAt,
            status: "OK",
          },
        ],
        response: localResult.advisoryMessage,
        durationMs: Date.now() - startedAt,
      });
    }
    return {
      intent: localResult.intent,
      products: cards,
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
    const cleanSummary = cached.summary ? cleanAiPatterns(cached.summary) : null;
    logClassicConceptsAiTrace({
      feature: "Website Smart Search Bar",
      actor: "Website Visitor",
      question: cleanQuery,
      model: LOCKED_CLAUDE_MODEL,
      effort: "medium",
      outcomeSource: "RESPONSE_CACHE",
      responseCacheStatus: "HIT",
      catalogCacheStatus: "HIT",
      cacheDetails: `${scopePrefix} HIT`,
      productLookupTriggered: true,
      productLookupQuery: cleanQuery,
      productLookupTotalScanned: snapshot.products.length,
      productsLookedUp: cards.map((c) => ({
        name: c.name,
        slug: c.slug,
        sku: c.sku,
        brand: "CLASSIC_CONCEPTS",
        priceInr: c.effectivePrice,
        url: `/shop/${c.slug}`,
        reason: c.reason || null,
      })),
      steps: [
        {
          stepNumber: 1,
          label: "Served search results from persistent response cache",
          detail: `scope=${scopePrefix}, matched=${cards.length}`,
          durationMs: Date.now() - startedAt,
          status: "OK",
        },
      ],
      response: cleanSummary || `Matched ${cards.length} catalog products.`,
      durationMs: Date.now() - startedAt,
    });
    return {
      intent: cachedIntent,
      products: cards,
      summary: cleanSummary,
      matchedCategories: cards.length > 0 ? localResult.matchedCategories : [],
      source: "cache",
      modelUsed: LOCKED_CLAUDE_MODEL,
      engineLabel: "Claude Haiku 5.5 • Instant Cache",
    };
  }

  let searchAiError: string | undefined;
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
If the input is a role introduction ("I am an engineer"), greeting, or off-topic query, set "matches": [] and write a polite clarifying or helpful summary. Otherwise select up to ${Math.min(limit, 8)} best-matching slugs from the candidate list below.`,
      userPrompt: `Search query: "${cleanQuery}"\n\n${formatCandidateProductsForPrompt(localResult.products, 15, cleanQuery)}`,
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

        const searchBudget = extractWebsiteBudgetConstraints(cleanQuery);
        const searchWantsPodium =
          Boolean(options?.onlyPodiums) ||
          /\b(pulpit|pulpits|podium|podiums|lectern|lecterns|rostrum)\b/i.test(cleanQuery);

        const aiCards = validMatches
          .map((m) => {
            const p = bySlug.get(m.slug)!;
            if (searchWantsPodium && !p.isPodium) return null;
            if (searchBudget.maxPrice !== null || searchBudget.minPrice !== null) {
              if (!(typeof p.effectivePrice === "number" && p.effectivePrice > 0)) {
                return null;
              }
              if (searchBudget.maxPrice !== null && p.effectivePrice > searchBudget.maxPrice) {
                return null;
              }
              if (searchBudget.minPrice !== null && p.effectivePrice < searchBudget.minPrice) {
                return null;
              }
            }
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

        const finalSummary = cleanSummary || localResult.advisoryMessage;
        logClassicConceptsAiTrace({
          feature: "Website Smart Search Bar",
          actor: "Website Visitor",
          question: cleanQuery,
          model: LOCKED_CLAUDE_MODEL,
          effort: "medium",
          outcomeSource: "LIVE_AI",
          responseCacheStatus: "MISS",
          catalogCacheStatus: "HIT",
          cacheDetails: `${scopePrefix} MISS -> cached response`,
          productLookupTriggered: true,
          productLookupQuery: cleanQuery,
          productLookupTotalScanned: snapshot.products.length,
          productsLookedUp: aiCards.map((c) => ({
            name: c.name,
            slug: c.slug,
            sku: c.sku,
            brand: "CLASSIC_CONCEPTS",
            priceInr: c.effectivePrice,
            url: `/shop/${c.slug}`,
            reason: c.reason || null,
          })),
          steps: [
            {
              stepNumber: 1,
              label: "Cache MISS -> called claude-haiku-5-5 Medium for semantic catalog search",
              detail: `intent=${intent}, matched=${aiCards.length}`,
              durationMs: Date.now() - startedAt,
              status: "OK",
            },
          ],
          response: finalSummary,
          durationMs: Date.now() - startedAt,
          tokenUsage: aiRes.usage || null,
        });

        return {
          intent,
          products: aiCards,
          summary: finalSummary,
          matchedCategories: aiCards.length > 0 ? localResult.matchedCategories : [],
          source: "ai",
          modelUsed: LOCKED_CLAUDE_MODEL,
          engineLabel: "Claude Haiku 5.5 • Live AI",
        };
      }
      searchAiError = "Claude search JSON parse failed";
    } else {
      searchAiError = aiRes.error;
    }
  }

  const fallbackSearchCards = localResult.products.map((p) => toCard(p));
  if (cleanQuery) {
    logClassicConceptsAiTrace({
      feature: "Website Smart Search Bar",
      actor: "Website Visitor",
      question: cleanQuery,
      model: "local-catalog",
      outcomeSource: "LOCAL_FALLBACK",
      responseCacheStatus: "MISS",
      catalogCacheStatus: "HIT",
      cacheDetails: localEngineLabel,
      productLookupTriggered: true,
      productLookupQuery: cleanQuery,
      productLookupTotalScanned: snapshot.products.length,
      productsLookedUp: fallbackSearchCards.map((c) => ({
        name: c.name,
        slug: c.slug,
        sku: c.sku,
        brand: "CLASSIC_CONCEPTS",
        priceInr: c.effectivePrice,
        url: `/shop/${c.slug}`,
      })),
      steps: [
        {
          stepNumber: 1,
          label: "Served local catalog search fallback",
          detail: `matched=${fallbackSearchCards.length}${searchAiError ? `, error=${searchAiError}` : ""}`,
          durationMs: Date.now() - startedAt,
          status: searchAiError ? "WARN" : "OK",
        },
      ],
      response: localResult.advisoryMessage,
      durationMs: Date.now() - startedAt,
      error: searchAiError || null,
    });
  }

  return {
    intent: localResult.intent,
    products: fallbackSearchCards,
    summary: localResult.advisoryMessage,
    matchedCategories: localResult.matchedCategories,
    source: "smart-local",
    modelUsed: "local-catalog",
    engineLabel: localEngineLabel,
  };
}

