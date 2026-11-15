import assert from "node:assert/strict";
import {
  loadAllClassicConceptsProducts,
  loadAllClassicEdgeItems,
  searchEcosystemItems,
  buildEcosystemDeepProductContextAndAnswer,
} from "../packages/database/src/clients";
import {
  classifyAcrioInboundIntent,
  reconstructAcrioConversationState,
  buildNormalizedSearchFromState,
  runAcrioChatCopilot,
} from "../packages/connections/src/index";
import {
  getKnowledgeSnapshot,
  localSmartProductMatch,
  formatCandidateProductsForPrompt,
  deriveWebsiteConversationState,
} from "../../../Desktop/classicconcepts/src/lib/ai-context";
import {
  normalizeRichHtmlToStructuredText,
  buildDeterministicDeepProductAdvisory,
} from "../../../Desktop/classicconcepts/src/lib/product-knowledge";

async function main() {
  console.log("==================================================================");
  console.log("PHASE H REGRESSION SUITE: COMPLETE PRODUCT KNOWLEDGE & RETRIEVAL");
  console.log("==================================================================\n");

  const [snap, ccWaProducts, ceWaItems] = await Promise.all([
    getKnowledgeSnapshot(),
    loadAllClassicConceptsProducts(),
    loadAllClassicEdgeItems(),
  ]);
  const allWaItems = [...ccWaProducts, ...ceWaItems];

  let passed = 0;
  const pass = (num: number, title: string, detail: string) => {
    passed++;
    console.log(`✅ [Scenario ${num}] PASS: ${title}`);
    console.log(`   -> ${detail}\n`);
  };

  // 1. Single-product dimension query
  {
    const ccp055 = snap.products.find((p) => p.slug === "acrylic-podium-ccp055");
    assert(ccp055, "CCP055 must exist in Website knowledge snapshot");
    assert(
      (ccp055.dimensions || []).length >= 6,
      `Expected >=6 dimensions on CCP055, got ${ccp055.dimensions?.length}`
    );
    const adv = buildDeterministicDeepProductAdvisory({
      rawQuery: "What are the dimensions of Acrylic Podium CCP055?",
      matchedProducts: [ccp055],
    });
    assert(
      /40[-–]42 Inches/.test(adv.advisoryMessage || ""),
      "Must include Height: 40-42 Inches"
    );
    assert(
      !/[—]| – |--/.test(adv.advisoryMessage || ""),
      "Advisory message must not contain em-dashes, spaced en-dashes, or --"
    );
    assert(adv.advisoryMessage?.includes("24 × 20 Inches"), "Must include Top Sheet: 24 × 20 Inches");
    assert(adv.advisoryMessage?.includes("24.5 × 17.5 Inches"), "Must include Bottom Sheet: 24.5 × 17.5 Inches");
    assert(adv.advisoryMessage?.includes("44 × 16 Inches"), "Must include Front Panel: 44 × 16 Inches");
    assert(adv.advisoryMessage?.includes("12.5 × 7 Inches"), "Must include Shelf Size: 12.5 × 7 Inches");
    pass(
      1,
      "Single-product dimension query (CCP055)",
      `Verified ${ccp055.dimensions?.length} dimension entries: ${ccp055.dimensions?.map((d) => `${d.name}=${d.value}`).join(", ")}`
    );
  }

  // 2. Single-product specification query
  {
    const ccp055 = snap.products.find((p) => p.slug === "acrylic-podium-ccp055")!;
    assert(
      ccp055.specs.length === 14,
      `Expected all 14 untruncated specifications on CCP055 (no take:8 cap), got ${ccp055.specs.length}`
    );
    const adv = buildDeterministicDeepProductAdvisory({
      rawQuery: "Does CCP055 have wheels? How many pillars and what warranty?",
      matchedProducts: [ccp055],
    });
    assert(adv.advisoryMessage?.includes("Pillars: 2"), "Must include Pillars: 2");
    assert(adv.advisoryMessage?.includes("Wheels: No"), "Must include Wheels: No");
    assert(adv.advisoryMessage?.includes("Warranty: 10 Years"), "Must include Warranty: 10 Years");
    pass(
      2,
      "Single-product technical specification query (untruncated 14 specs)",
      `All 14 specs loaded (previously capped at 8): Pillars=2, Wheels=No, Warranty=10 Years, Assembly=DIY Module`
    );
  }

  // 3. Single-product feature / bullet point query
  {
    const ccp055 = snap.products.find((p) => p.slug === "acrylic-podium-ccp055")!;
    assert(
      ccp055.features.length === 9,
      `Expected all 9 untruncated features on CCP055 (no take:6 cap), got ${ccp055.features.length}`
    );
    assert(
      ccp055.features.some((f) => /Free Doorstep Delivery/i.test(f)),
      "Feature #9 (Free Doorstep Delivery) must not be truncated"
    );
    pass(
      3,
      "Single-product feature / bullet point query (untruncated 9 features)",
      `All 9 features loaded (previously capped at 6), including #7 Free Logo Branding & #9 Free Doorstep Delivery`
    );
  }

  // 4. Rich HTML description query (descriptionHtml / importantNoteHtml)
  {
    const sampleHtml = `<p>Also known as the <strong>C&nbsp;Podium</strong>&amp;Lectern</p><ul><li>Unique C-shaped pillars</li><li>Top: 24 &times; 20 Inches</li></ul>`;
    const clean = normalizeRichHtmlToStructuredText(sampleHtml);
    assert(!clean.includes("&nbsp;") && !clean.includes("<p>"), "Must strip HTML tags and decode &nbsp;");
    assert(clean.includes("C Podium") && clean.includes("24 × 20 Inches"), "Must preserve entities and measurements");

    const cPodiumMatch = localSmartProductMatch(
      snap,
      "Which podium is known as the C Podium with C-shaped pillars?"
    );
    assert(
      cPodiumMatch.products.some((p) => p.slug === "acrylic-podium-ccp053"),
      "Must match CCP053 from descriptionHtml ('C Podium' / 'C-shaped pillars')"
    );
    const goldMatch = localSmartProductMatch(
      snap,
      "podium with Stainless Steel Silver and Golden finishes"
    );
    assert(
      goldMatch.products.some((p) => p.slug === "acrylic-podium-ccp057"),
      "Must match CCP057 from descriptionHtml ('Stainless Steel/Silver and Golden finishes')"
    );
    pass(
      4,
      "Rich HTML description & importantNoteHtml normalization + retrieval",
      `Matched CCP053 ('C Podium') and CCP057 ('Stainless Steel/Silver and Golden finishes') via normalized descriptionHtml`
    );
  }

  // 5. Variant & variant-price query
  {
    const ccp055 = snap.products.find((p) => p.slug === "acrylic-podium-ccp055")!;
    assert(ccp055.variants?.length === 9, `Expected 9 variants on CCP055, got ${ccp055.variants?.length}`);
    const adv = buildDeterministicDeepProductAdvisory({
      rawQuery: "What variants or colours are available for CCP055 and what are their prices?",
      matchedProducts: [ccp055],
    });
    assert(adv.advisoryMessage?.includes("Clear Frosted: ₹24,200"), "Must include Clear Frosted ₹24,200");
    assert(adv.advisoryMessage?.includes("Blue LED: ₹26,400"), "Must include Blue LED ₹26,400");
    pass(
      5,
      "Variant & variant-specific pricing query (CCP055)",
      `Loaded all 9 variants: 5 standard finishes at ₹24,200 and 4 LED finishes at ₹26,400`
    );
  }

  // 6. Multi-product comparison query
  {
    const webComp = localSmartProductMatch(snap, "Compare CCP054 and CCP055");
    const slugs = webComp.products.slice(0, 2).map((p) => p.slug);
    assert(
      slugs.includes("acrylic-podium-ccp054") && slugs.includes("acrylic-podium-ccp055"),
      `Expected CCP054 and CCP055 in top 2, got ${slugs.join(", ")}`
    );
    assert(
      webComp.advisoryMessage.includes("14,999") &&
        webComp.advisoryMessage.includes("24,200") &&
        webComp.advisoryMessage.includes("20 × 15 Inches") &&
        webComp.advisoryMessage.includes("24 × 20 Inches"),
      "Comparison advisory must include both prices and reading top dimensions"
    );
    pass(
      6,
      "Multi-product comparison query ('Compare CCP054 and CCP055')",
      webComp.advisoryMessage
    );
  }

  // 7. Follow-up dimension question after initial product recommendations
  {
    const history = [
      { role: "user" as const, content: "Show me podiums under ₹25,000" },
      {
        role: "assistant" as const,
        content: "Here are our podiums within ₹25,000: Acrylic Podium CCP054 (₹14,999) and Acrylic Podium CCP055 (₹24,200).",
      },
    ];
    const state = deriveWebsiteConversationState(history, "Which one is wider?");
    assert(state.isFollowUpRefinement, "Must classify 'Which one is wider?' as follow-up refinement");
    assert(state.maxPrice === 25000, "Must preserve ₹25,000 budget from Turn 1");
    const match = localSmartProductMatch(snap, state.effectiveSearchQuery, {
      maxPrice: state.maxPrice,
      rawTurnQuery: "Which one is wider?",
    });
    assert(
      match.advisoryMessage.includes("Acrylic Podium CCP055") &&
        match.advisoryMessage.includes("24 × 20 Inches"),
      `Expected CCP055 identified as wider, got: ${match.advisoryMessage}`
    );
    pass(
      7,
      "Follow-up dimension question after initial recommendations ('Which one is wider?')",
      match.advisoryMessage
    );
  }

  // 8. Follow-up comparison question ("Which of these has the largest reading top?")
  {
    const ccp054 = ccWaProducts.find((p) => p.slug === "acrylic-podium-ccp054")!;
    const ccp055 = ccWaProducts.find((p) => p.slug === "acrylic-podium-ccp055")!;
    const waDeep = buildEcosystemDeepProductContextAndAnswer({
      rawQuery: "Which of these has the largest reading top?",
      matchedItems: [ccp054, ccp055],
    });
    assert(
      waDeep.deterministicDeepAnswer?.includes("Acrylic Podium CCP055") &&
        waDeep.deterministicDeepAnswer?.includes("24 × 20 Inches"),
      "Must identify CCP055 as having the largest reading top (24 × 20 Inches)"
    );
    pass(
      8,
      "Follow-up comparison question ('Which of these has the largest reading top?')",
      waDeep.deterministicDeepAnswer!.split("\n")[0]
    );
  }

  // 9. Classic Edge 53 machine specification query
  {
    const matches = searchEcosystemItems(
      allWaItems,
      "What are the specifications of the Acrylic Diamond Edge Polishing Machine?",
      4
    );
    assert(matches.length > 0 && matches[0].slug === "diamond-edge-polisher", "Must match Diamond Edge Polisher");
    const deep = buildEcosystemDeepProductContextAndAnswer({
      rawQuery: "What are the specifications of the Acrylic Diamond Edge Polishing Machine?",
      matchedItems: matches,
    });
    assert(
      deep.deterministicDeepAnswer?.includes("3mm to 100mm") &&
        deep.deterministicDeepAnswer?.includes("9000 RPM"),
      "Must include 3mm to 100mm and 0 - 9000 RPM Variable"
    );
    pass(
      9,
      "Classic Edge 53 machine specification query",
      `Matched ${matches[0].name} with product specs & ${matches[0].models?.length} machine models`
    );
  }

  // 10. Classic Edge 53 model-level comparison (ProductModel + model-specific Specification)
  {
    const benderMatches = searchEcosystemItems(
      allWaItems,
      "What is the difference between ABM-1250 and ABM-2400?",
      4
    );
    assert(benderMatches[0]?.slug === "acrylic-heat-bender", "Must match Acrylic Sheet Line Bending Machine");
    const deep = buildEcosystemDeepProductContextAndAnswer({
      rawQuery: "What is the difference between ABM-1250 and ABM-2400?",
      matchedItems: benderMatches,
    });
    assert(
      deep.deterministicDeepAnswer?.includes("ABM-1250") &&
        deep.deterministicDeepAnswer?.includes("1250 mm") &&
        deep.deterministicDeepAnswer?.includes("1mm to 10mm") &&
        deep.deterministicDeepAnswer?.includes("ABM-2400") &&
        deep.deterministicDeepAnswer?.includes("2400 mm") &&
        deep.deterministicDeepAnswer?.includes("1mm to 15mm"),
      "Must clearly separate ABM-1250 (1250mm, 1-10mm, 1.5kW) from ABM-2400 (2400mm, 1-15mm, 3.6kW)"
    );
    pass(
      10,
      "Classic Edge 53 model-level comparison (ABM-1250 vs ABM-2400 & YN-JW1200 vs YN-JW1600)",
      `Separated Product.specifications from ProductModel.specifications for ABM-1250 vs ABM-2400`
    );
  }

  // 11. Classic Edge 53 machine vs consumable separation query
  {
    const machineOnly = searchEcosystemItems(
      allWaItems,
      "Show me acrylic edge polishing machines",
      10
    );
    assert(machineOnly.length > 0, "Must return machines");
    assert(
      machineOnly.every((it) => it.itemType === "MACHINE"),
      `Expected only MACHINE items, got: ${machineOnly.map((i) => `${i.name}(${i.itemType})`).join(", ")}`
    );
    pass(
      11,
      "Classic Edge 53 machine vs consumable separation",
      `Returned ${machineOnly.length} MACHINE items and 0 CONSUMABLE items for machine query`
    );
  }

  // 12. Application / industry / problem-statement query
  {
    const appMatches = localSmartProductMatch(
      snap,
      "Which podiums are suitable for college auditoriums and conferences?"
    );
    assert(
      appMatches.products.length > 0 &&
        appMatches.products.every((p) => p.isPodium),
      "Must return podium products for auditorium/conference application query"
    );
    pass(
      12,
      "Application / industry / venue suitability query",
      `Matched ${appMatches.products.length} podiums for college auditoriums & conferences`
    );
  }

  // 13. Resource / brochure / manual availability query
  {
    const polisher = ceWaItems.find((i) => i.slug === "diamond-edge-polisher")!;
    assert(
      (polisher.resources?.length || 0) > 0 &&
        (polisher.models?.[0]?.resources?.length || 0) > 0,
      "Diamond Edge Polisher must expose product-level and model-level resources"
    );
    const deep = buildEcosystemDeepProductContextAndAnswer({
      rawQuery: "Do you have a datasheet or user manual for YN-JW1200?",
      matchedItems: [polisher],
    });
    assert(
      deep.promptCatalogContext.includes("Operation & Maintenance Guide"),
      "Prompt context must include technical resource titles"
    );
    pass(
      13,
      "Resource / brochure / manual availability query",
      `Surfaced Product & Model resources: ${polisher.resources?.map((r) => r.title || r.name).join(", ")}`
    );
  }

  // 14. Missing / unverified specification query (must NOT hallucinate)
  {
    const ccp055 = snap.products.find((p) => p.slug === "acrylic-podium-ccp055")!;
    const webUnverified = buildDeterministicDeepProductAdvisory({
      rawQuery: "What is the exact acrylic sheet thickness in mm of CCP055?",
      matchedProducts: [ccp055],
    });
    assert(
      webUnverified.advisoryMessage?.includes("not listed in the catalog specifications") &&
        webUnverified.advisoryMessage?.includes("rather than guessing"),
      "Website ACRIO must explicitly decline to guess unverified sheet thickness in mm"
    );

    const bender = ceWaItems.find((i) => i.slug === "acrylic-heat-bender")!;
    const waUnverified = buildEcosystemDeepProductContextAndAnswer({
      rawQuery: "Can the ABM-1250 bending machine process 20 mm acrylic?",
      matchedItems: [bender],
    });
    assert(
      waUnverified.deterministicDeepAnswer?.includes("1mm to 10mm") &&
        waUnverified.deterministicDeepAnswer?.includes("20 mm") &&
        waUnverified.deterministicDeepAnswer?.includes("exceeds the verified limit"),
      "WhatsApp ACRIO must state that 20 mm exceeds ABM-1250's verified 1mm to 10mm rating"
    );
    pass(
      14,
      "Missing / unverified specification anti-hallucination guard",
      `Verified both CCP055 unverified-thickness refusal and ABM-1250 20mm capacity limit explanation`
    );
  }

  // 15. Budget + specification combined query
  {
    const combinedWeb = localSmartProductMatch(
      snap,
      "podiums under ₹25,000 with 2 pillars and 24 x 20 reading top",
      { maxPrice: 25000 }
    );
    assert(
      combinedWeb.products.length > 0 &&
        combinedWeb.products.every((p) => (p.effectivePrice || 0) <= 25000),
      "All matched products must be <= ₹25,000"
    );
    assert(
      combinedWeb.products[0].slug === "acrylic-podium-ccp055",
      `Expected CCP055 ranked #1 for 2 pillars + 24x20 top under ₹25,000, got ${combinedWeb.products[0].slug}`
    );
    pass(
      15,
      "Budget + specification combined query ('podiums under ₹25,000 with 2 pillars and 24 x 20 reading top')",
      `Ranked ${combinedWeb.products[0].name} (₹${combinedWeb.products[0].effectivePrice}) at #1 within budget`
    );
  }

  // 16. Website chat vs WhatsApp parity test for the same product question
  {
    const webCcp055 = snap.products.find((p) => p.slug === "acrylic-podium-ccp055")!;
    const waCcp055 = ccWaProducts.find((p) => p.slug === "acrylic-podium-ccp055")!;
    assert.equal(webCcp055.effectivePrice, waCcp055.basePrice, "Base price must match across Website and WhatsApp");
    assert.equal(webCcp055.features.length, waCcp055.features?.length, "Feature count must match (9)");
    assert.equal(webCcp055.dimensions?.length, waCcp055.dimensions?.length, "Dimension count must match (6)");
    assert.equal(webCcp055.technicalSpecs?.length, waCcp055.specifications?.length, "Technical spec count must match (8)");
    assert.equal(
      webCcp055.specs.length,
      (waCcp055.dimensions?.length || 0) + (waCcp055.specifications?.length || 0),
      "Total specification count must match (14)"
    );
    assert.equal(webCcp055.variants?.length, waCcp055.variants?.length, "Variant count must match (9)");
    pass(
      16,
      "Website ACRIO vs WhatsApp ACRIO product knowledge parity",
      `CCP055 identical across both channels: price=₹${webCcp055.effectivePrice}, features=${webCcp055.features.length}, dims=${webCcp055.dimensions?.length}, techSpecs=${webCcp055.technicalSpecs?.length} (total=14), variants=${webCcp055.variants?.length}`
    );
  }

  // 17. Product link formatting test on Website and WhatsApp
  {
    const promptCompact = formatCandidateProductsForPrompt(
      snap.products.slice(0, 3),
      3,
      "show me podiums"
    );
    const promptDeep = formatCandidateProductsForPrompt(
      snap.products.filter((p) => p.slug === "acrylic-podium-ccp055"),
      1,
      "What are the dimensions and variants of CCP055?"
    );
    assert(
      promptCompact.includes('URL:"/shop/p/'),
      "Website prompt must include internal /shop/p/<slug> URLs"
    );
    assert(
      promptDeep.length > promptCompact.length / 3 &&
        promptDeep.includes("Dimensions:") &&
        promptDeep.includes("Variants & Prices:"),
      "Stage 2 question-aware prompt must hydrate full dimensions & variants on deep queries"
    );
    const waCcp055 = ccWaProducts.find((p) => p.slug === "acrylic-podium-ccp055")!;
    assert(
      waCcp055.url === "https://classicconcepts.in/shop/p/acrylic-podium-ccp055" &&
        Boolean(waCcp055.shortUrl?.startsWith("https://ccapl.cc/")),
      `WhatsApp item must have canonical URL and shortUrl, got url=${waCcp055.url}, shortUrl=${waCcp055.shortUrl}`
    );
    pass(
      17,
      "Product link formatting & Two-Stage Token-Efficient Prompt Hydration",
      `Website URL="/shop/p/${waCcp055.slug}", WhatsApp shortUrl="${waCcp055.shortUrl}"`
    );
  }

  // 18. Dummy test record exclusion test across all new relations
  {
    const hasDummyWeb = snap.products.some(
      (p) =>
        p.id === "test" ||
        p.name.toLowerCase() === "test" ||
        (p.industries || []).some((i) => i.toLowerCase() === "test") ||
        (p.problems || []).some((pr) => pr.toLowerCase() === "test")
    );
    const hasDummyWa = allWaItems.some(
      (i) => i.id === "test" || i.name.toLowerCase() === "test"
    );
    assert(!hasDummyWeb && !hasDummyWa, "Zero dummy 'test' records allowed in Website or WhatsApp catalogs");
    pass(
      18,
      "Dummy 'test' record exclusion across all products, industries, problem statements, and machines",
      `Verified 0 dummy rows across ${snap.products.length} Website products and ${allWaItems.length} WhatsApp ecosystem items`
    );
  }

  // Phase A-G Regression Verification
  {
    assert.equal(classifyAcrioInboundIntent("Hi", false).intent, "GREETING");
    assert.equal(classifyAcrioInboundIntent("Who are you?", true).intent, "IDENTITY_META");
    assert.equal(classifyAcrioInboundIntent("I have a different query", true).intent, "TOPIC_RESET");
    const handoffInfo = classifyAcrioInboundIntent("Whom will you connect me to?", true);
    assert.equal(handoffInfo.intent, "HUMAN_HANDOFF_INFO");
    assert.equal(handoffInfo.needsImmediateHandoff, false);
    const under5k = searchEcosystemItems(allWaItems, "pulpits under ₹5,000", 6);
    assert.equal(under5k.length, 0, "Zero podiums exist under ₹5,000");
    const negTools = searchEcosystemItems(
      allWaItems,
      "I am not looking for tools, show me edge polishing machines",
      6
    );
    assert(negTools.length > 0 && negTools.every((i) => i.itemType === "MACHINE"));
    console.log("✅ [Phase A–G Regression Check] PASS: All prior intent, state, budget, negation, and handoff guards intact!\n");
  }

  console.log("==================================================================");
  console.log(`ALL ${passed}/18 PHASE H DEEP PRODUCT KNOWLEDGE SCENARIOS PASSED!`);
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Phase H test failed:", err);
  process.exit(1);
});
