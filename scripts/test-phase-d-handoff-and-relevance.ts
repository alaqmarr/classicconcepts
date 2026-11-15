import assert from "node:assert/strict";
import { getKnowledgeSnapshot, localSmartProductMatch } from "../src/lib/ai-context";
import { runCustomerConcierge } from "../src/lib/ai";

async function main() {
  console.log(
    "=== Phase D Regression Suite (classicconcepts): Response Relevance & Website WhatsApp Handoff ==="
  );

  const snapshot = await getKnowledgeSnapshot();

  // 1. Informational handoff questions vs direct handoff requests return 0 products
  const handoffQueries = [
    "Whom will you connect me to?",
    "Who is your sales manager?",
    "What team will you connect me to?",
    "Connect me to a human",
    "Talk to sales team",
    "Can someone call me?",
  ];
  for (const q of handoffQueries) {
    const res = localSmartProductMatch(snapshot, q, { limit: 4 });
    assert.equal(
      res.intent,
      "human_handoff_info",
      `Expected human_handoff_info for "${q}", got ${res.intent}`
    );
    assert.equal(
      res.products.length,
      0,
      `Expected 0 products for "${q}", got ${res.products.length}`
    );
  }
  console.log(
    "  [PASS] Informational and direct human handoff queries return human_handoff_info with 0 product cards"
  );

  // 2. Multi-turn response relevance & context-carrying WhatsApp handoff prefill
  const history = [
    { role: "user" as const, text: "I am looking for pulpits under ₹25,000" },
    { role: "assistant" as const, text: "Here are our acrylic podiums under ₹25,000." },
    { role: "user" as const, text: "We can increase the budget to ₹30,000" },
    { role: "assistant" as const, text: "Here are podium options up to ₹30,000." },
  ];

  const whoReply = await runCustomerConcierge("Who are you?", false, history);
  assert.equal(whoReply.products.length, 0, '"Who are you?" must return 0 products');
  assert.ok(/ACRIO/i.test(whoReply.message));

  const handoffReply = await runCustomerConcierge(
    "Connect me to a human",
    false,
    history
  );
  assert.equal(handoffReply.intent, "human_handoff_info");
  assert.equal(
    handoffReply.products.length,
    0,
    '"Connect me to a human" must return 0 products'
  );
  assert.ok(
    /pulpit/i.test(handoffReply.whatsappPrefill) &&
      /30,000/.test(handoffReply.whatsappPrefill),
    `Expected whatsappPrefill to carry over pulpit + ₹30,000 context, got: "${handoffReply.whatsappPrefill}"`
  );
  console.log(
    `  [PASS] Website multi-turn handoff prefill carries active product + budget context: "${handoffReply.whatsappPrefill}"`
  );

  console.log(
    "\nALL PHASE D RESPONSE RELEVANCE & HANDOFF TESTS PASSED (classicconcepts)!"
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Phase D classicconcepts test failed:", err);
  process.exit(1);
});
