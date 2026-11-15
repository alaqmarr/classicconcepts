import assert from "node:assert/strict";
import {
  getKnowledgeSnapshot,
  extractWebsiteBudgetConstraints,
  deriveWebsiteConversationState,
  localSmartProductMatch,
} from "../src/lib/ai-context";
import { runCustomerConcierge } from "../src/lib/ai";

async function main() {
  console.log("=== Phase B Regression Suite (classicconcepts): Website Multi-Turn Memory & Budget Context ===");

  // 1. Budget extraction tests
  assert.equal(
    extractWebsiteBudgetConstraints("I am looking for pulpits under ₹25,000").maxPrice,
    25000
  );
  assert.equal(
    extractWebsiteBudgetConstraints("We can increase the budget to ₹30,000").maxPrice,
    30000
  );
  assert.equal(
    extractWebsiteBudgetConstraints("Can we stretch the budget to 35k?").maxPrice,
    35000
  );
  console.log("  [PASS] Website budget parser extracts 'under ₹25,000', 'increase the budget to ₹30,000', and '35k'");

  const snapshot = await getKnowledgeSnapshot();
  assert.ok(snapshot.products.length > 50, "Expected catalog snapshot to contain >50 products");

  // 2. Multi-turn state derivation: pulpits under ₹25,000 -> increase budget to ₹30,000 -> most premium transparent ones
  const historyTurn2: { role: "user" | "assistant"; text: string }[] = [
    { role: "user", text: "I am looking for pulpits under ₹25,000" },
    { role: "assistant", text: "Here are matching clear acrylic podiums under ₹25,000." },
  ];
  const state2 = deriveWebsiteConversationState(
    historyTurn2,
    "We can increase the budget to ₹30,000"
  );
  assert.equal(state2.productFamily, "podium");
  assert.equal(state2.onlyPodiums, true);
  assert.equal(state2.maxPrice, 30000);
  assert.equal(state2.isFollowUpRefinement, true);

  const match2 = localSmartProductMatch(snapshot, state2.effectiveSearchQuery, {
    limit: 6,
    onlyPodiums: state2.onlyPodiums,
    maxPrice: state2.maxPrice,
  });
  assert.equal(match2.intent, "product_match");
  assert.ok(match2.products.length > 0, "Should return podiums <= ₹30,000");
  for (const p of match2.products) {
    assert.equal(p.isPodium, true, `Expected podium, got "${p.name}"`);
    if (typeof p.effectivePrice === "number" && p.effectivePrice > 0) {
      assert.ok(
        p.effectivePrice <= 30000,
        `Product "${p.name}" (₹${p.effectivePrice}) exceeds ₹30,000`
      );
    }
  }
  console.log(
    `  [PASS] Multi-turn budget increase to ₹30,000 preserved podium category and returned ${match2.products.length} podiums <= ₹30,000`
  );

  // 3. Follow-up preference refinement: "Show me the most premium transparent ones"
  const historyTurn3: { role: "user" | "assistant"; text: string }[] = [
    ...historyTurn2,
    { role: "user", text: "We can increase the budget to ₹30,000" },
    { role: "assistant", text: "Here are podiums up to ₹30,000." },
  ];
  const state3 = deriveWebsiteConversationState(
    historyTurn3,
    "Show me the most premium transparent ones"
  );
  assert.equal(state3.productFamily, "podium");
  assert.equal(state3.maxPrice, 30000);
  assert.ok(state3.preferences.includes("premium"));
  assert.ok(state3.preferences.includes("transparent"));

  const conciergeRes = await runCustomerConcierge(
    "Show me the most premium transparent ones",
    false,
    historyTurn3
  );
  assert.equal(conciergeRes.intent, "product_match");
  assert.ok(conciergeRes.products.length > 0, "Concierge should return premium transparent podiums <= ₹30,000");
  for (const p of conciergeRes.products) {
    assert.ok(/podium|pulpit|lectern/i.test(`${p.name} ${p.categoryName}`), `Expected podium, got "${p.name}"`);
    if (typeof p.effectivePrice === "number" && p.effectivePrice > 0) {
      assert.ok(p.effectivePrice <= 30000, `Podium "${p.name}" exceeds ₹30,000`);
    }
  }
  console.log(
    `  [PASS] runCustomerConcierge follow-up ("Show me the most premium transparent ones") returned ${conciergeRes.products.length} podiums <= ₹30,000`
  );

  // 4. Genuine topic switch & topic reset
  const switchedState = deriveWebsiteConversationState(
    historyTurn3,
    "Do you have trophies under ₹1,500?"
  );
  assert.equal(switchedState.productFamily, "award");
  assert.equal(switchedState.onlyPodiums, false);
  assert.equal(switchedState.maxPrice, 1500);

  const resetState = deriveWebsiteConversationState(
    historyTurn3,
    "I have a different query"
  );
  assert.equal(resetState.productFamily, null);
  assert.equal(resetState.maxPrice, null);
  console.log("  [PASS] Website topic switches and topic resets clear prior category and budget cleanly");

  console.log("\nALL PHASE B CONVERSATION MEMORY & CONTEXT TESTS PASSED (classicconcepts)!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase B website test failed:", err);
    process.exit(1);
  });
