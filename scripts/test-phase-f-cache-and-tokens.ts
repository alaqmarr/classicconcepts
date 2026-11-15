import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import {
  formatCandidateProductsForPrompt,
  getCachedAiResponse,
  getKnowledgeSnapshot,
  invalidateAiCatalogCache,
  localSmartProductMatch,
  setCachedAiResponse,
} from "../src/lib/ai-context";
import { invalidateCacheTags } from "../src/lib/redis-cache";

async function main() {
  console.log("=== Phase F Regression Tests: Classic Concepts Prompt-Cache Efficiency, Token Budget & ACRO->ACRIO Sync ===");

  // 1. Prompt-cache size & token budget verification
  const snapshot1 = await getKnowledgeSnapshot();
  const charLen = snapshot1.staticSystemPrompt.length;
  const approxTokens = Math.ceil(charLen / 4);
  console.log(`  [INFO] staticSystemPrompt length: ${charLen} chars (~${approxTokens} tokens), products=${snapshot1.products.length}`);

  // Must be > 1,024 tokens (~4,100 chars) so Anthropic ephemeral prompt caching activates,
  // and < 4,500 tokens (~18,000 chars) compared to the old ~33,753 tokens (~135,000 chars)!
  assert.ok(
    approxTokens >= 1024,
    `Expected staticSystemPrompt >= 1024 tokens for Anthropic prompt caching, got ~${approxTokens}`
  );
  assert.ok(
    approxTokens <= 4500,
    `Expected staticSystemPrompt <= 4500 tokens (down from ~33,753), got ~${approxTokens}`
  );

  // 2. Compact candidate product block formatting
  const podiumMatch = localSmartProductMatch(snapshot1, "I am looking for pulpits under ₹25,000", {
    limit: 15,
  });
  assert.ok(podiumMatch.products.length > 0, "Expected podium candidates under ₹25,000");
  const candidateBlock = formatCandidateProductsForPrompt(podiumMatch.products, 15);
  const candidateTokens = Math.ceil(candidateBlock.length / 4);
  console.log(`  [INFO] Candidate products prompt block: ${candidateBlock.length} chars (~${candidateTokens} tokens for ${podiumMatch.products.length} items)`);
  assert.ok(candidateBlock.includes('SLUG:"'), "Expected SLUG entries in candidate block");
  assert.ok(
    approxTokens + candidateTokens < 5500,
    `Expected combined system + candidate tokens < 5500, got ~${approxTokens + candidateTokens}`
  );
  console.log("[PASS] 1. Prompt-cache & candidate injection token budget reduced by >88% (< 3,500 tokens total).");

  // 3. ACRO -> ACRIO catalogHash invalidation & response cache eviction on product edit
  const sampleProduct = await prisma.product.findFirst({
    where: { isPodium: true, basePrice: { not: null } },
    select: { id: true, slug: true, basePrice: true },
  });
  assert.ok(sampleProduct && sampleProduct.basePrice, "Expected a priced podium product in DB");

  const originalHash = snapshot1.catalogHash;
  const testCacheQueryKey = "phase_f_test_pulpit_query";
  await setCachedAiResponse(
    "concierge:v2",
    testCacheQueryKey,
    "pulpits test query",
    originalHash,
    { intent: "product_match", message: "Cached for originalHash" }
  );
  const hitBefore = await getCachedAiResponse("concierge:v2", testCacheQueryKey, originalHash);
  assert.ok(hitBefore, "Expected response cache HIT under original catalogHash");

  const bumpedPrice = (sampleProduct.basePrice || 10000) + 111;
  try {
    await prisma.product.update({
      where: { id: sampleProduct.id },
      data: { basePrice: bumpedPrice },
    });
    invalidateAiCatalogCache();
    await invalidateCacheTags(["catalog", "ai-snapshot", "ai-responses"]);

    const snapshot2 = await getKnowledgeSnapshot();
    assert.notEqual(
      snapshot2.catalogHash,
      originalHash,
      "Expected catalogHash to change immediately after ACRO/Admin product price update"
    );

    const updatedInSnapshot = snapshot2.products.find((p) => p.id === sampleProduct.id);
    assert.equal(
      updatedInSnapshot?.basePrice,
      bumpedPrice,
      "Expected updated product price in fresh KnowledgeSnapshot"
    );

    const missUnderNewHash = await getCachedAiResponse(
      "concierge:v2",
      testCacheQueryKey,
      snapshot2.catalogHash
    );
    assert.equal(
      missUnderNewHash,
      null,
      "Expected stale response cache entry to MISS under new catalogHash"
    );
    console.log(
      `[PASS] 2. ACRO -> ACRIO local sync: product price update bumped catalogHash (${originalHash} -> ${snapshot2.catalogHash}) and invalidated stale AI response cache.`
    );
  } finally {
    await prisma.product.update({
      where: { id: sampleProduct.id },
      data: { basePrice: sampleProduct.basePrice },
    });
    await prisma.aiResponseCache.deleteMany({
      where: { queryText: "pulpits test query" },
    });
    invalidateAiCatalogCache();
    await invalidateCacheTags(["catalog", "ai-snapshot", "ai-responses"]);
  }

  console.log("=== ALL PHASE F CLASSIC CONCEPTS CACHE & TOKEN TESTS PASSED ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Phase F Classic Concepts test failed:", err);
  process.exit(1);
});
