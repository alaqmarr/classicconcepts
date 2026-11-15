import assert from "node:assert/strict";
import {
  getKnowledgeSnapshot,
  localSmartProductMatch,
  formatCandidateProductsForPrompt,
  deriveWebsiteConversationState,
} from "../src/lib/ai-context";
import {
  normalizeRichHtmlToStructuredText,
  buildDeterministicDeepProductAdvisory,
} from "../src/lib/product-knowledge";

async function main() {
  const snap = await getKnowledgeSnapshot();
  const ccp055 = snap.products.find((p) => p.slug === "acrylic-podium-ccp055");
  assert(ccp055, "CCP055 must exist in Website knowledge snapshot");
  assert.equal(ccp055.features.length, 9, "Expected 9 features on CCP055");
  assert.equal(ccp055.specs.length, 14, "Expected 14 specs on CCP055");
  assert.equal(ccp055.variants?.length, 9, "Expected 9 variants on CCP055");

  const sampleHtml = `<p>Also known as the <strong>C&nbsp;Podium</strong></p>`;
  assert.equal(normalizeRichHtmlToStructuredText(sampleHtml), "Also known as the C Podium");

  const adv = buildDeterministicDeepProductAdvisory({
    rawQuery: "What are the dimensions of Acrylic Podium CCP055?",
    matchedProducts: [ccp055],
  });
  assert(adv.advisoryMessage?.includes("24 × 20 Inches"));

  const comp = localSmartProductMatch(snap, "Compare CCP054 and CCP055");
  assert(comp.advisoryMessage.includes("14,999") && comp.advisoryMessage.includes("24,200"));

  const state = deriveWebsiteConversationState(
    [{ role: "user", text: "Show me podiums under ₹25,000" }],
    "Which one is wider?"
  );
  assert(state.isFollowUpRefinement);

  const prompt = formatCandidateProductsForPrompt([ccp055], 1, "What variants and dimensions does CCP055 have?");
  assert(prompt.includes("Dimensions:") && prompt.includes("Variants & Prices:"));

  console.log("✅ Classic Concepts Phase H deep product knowledge test passed!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
