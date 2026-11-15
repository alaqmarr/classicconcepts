import assert from "node:assert/strict";
import {
  getKnowledgeSnapshot,
  localSmartProductMatch,
} from "../src/lib/ai-context";
import { runCustomerConcierge } from "../src/lib/ai";

async function main() {
  console.log("=== Phase C Regression Suite (classicconcepts): Retrieval, Category Isolation & Strict Budget ===");

  const snapshot = await getKnowledgeSnapshot();
  assert.ok(snapshot.products.length > 50, "Expected >50 catalog products");

  // 1. Pulpits under ₹25,000 -> strictly podiums with verified price <= ₹25,000 (0 unpriced, 0 trays/tables)
  const m25 = localSmartProductMatch(
    snapshot,
    "I am looking for pulpits under ₹25,000",
    { limit: 12 }
  );
  assert.equal(m25.intent, "product_match");
  assert.ok(m25.products.length > 0, "Should return podiums <= ₹25,000");
  for (const p of m25.products) {
    assert.equal(p.isPodium, true, `Expected podium, got "${p.name}"`);
    assert.ok(
      typeof p.effectivePrice === "number" && p.effectivePrice > 0 && p.effectivePrice <= 25000,
      `Expected verified price <= ₹25,000 on "${p.name}", got ${p.effectivePrice}`
    );
  }
  console.log(
    `  [PASS] 'pulpits under ₹25,000' returned ${m25.products.length} verified priced podiums <= ₹25,000 (0 unpriced, 0 non-podiums)`
  );

  // 2. Tight budget ('pulpits under ₹5,000') -> 0 false matches + starting price in advisory message
  const m5 = localSmartProductMatch(
    snapshot,
    "I am looking for pulpits under ₹5,000",
    { limit: 8 }
  );
  assert.equal(
    m5.intent,
    "no_match",
    "Pulpits under ₹5,000 must return intent='no_match' when no podium is <= ₹5,000"
  );
  assert.equal(
    m5.products.length,
    0,
    "Pulpits under ₹5,000 must return 0 products (never return unpriced podiums as false matches)"
  );
  assert.ok(
    /start from ₹/i.test(m5.advisoryMessage),
    `Advisory message should state starting price for podiums, got: "${m5.advisoryMessage}"`
  );
  console.log(
    `  [PASS] Tight budget 'pulpits under ₹5,000' returned 0 false matches with advisory: "${m5.advisoryMessage}"`
  );

  // 3. Awards/trophies query must never include stage podiums
  const mAwards = localSmartProductMatch(
    snapshot,
    "acrylic trophies and mementos for college students under ₹2,000",
    { limit: 8 }
  );
  for (const p of mAwards.products) {
    assert.equal(p.isPodium, false, `Award query must not return podium "${p.name}"`);
    assert.ok(
      typeof p.effectivePrice === "number" && p.effectivePrice > 0 && p.effectivePrice <= 2000,
      `Award item "${p.name}" (${p.effectivePrice}) must be priced <= ₹2,000`
    );
  }
  console.log(
    `  [PASS] Award query under ₹2,000 returned ${mAwards.products.length} verified priced items with 0 podiums`
  );

  // 4. Concierge fallback on tight budget returns 0 products and honest starting price
  const concierge5k = await runCustomerConcierge(
    "I am looking for pulpits under ₹5,000",
    false
  );
  assert.equal(concierge5k.products.length, 0);
  assert.ok(/start from ₹/i.test(concierge5k.message));
  console.log("  [PASS] runCustomerConcierge ('pulpits under ₹5,000') returned 0 products and honest starting price");

  console.log("\nALL PHASE C RETRIEVAL & BUDGET TESTS PASSED (classicconcepts)!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase C website test failed:", err);
    process.exit(1);
  });
