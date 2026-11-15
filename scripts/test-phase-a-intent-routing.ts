import assert from "node:assert/strict";
import {
  getKnowledgeSnapshot,
  localSmartProductMatch,
  isNonProductQueryIntent,
} from "../src/lib/ai-context";

async function main() {
  console.log("=== Phase A Regression Tests: Classic Concepts Website Intent Routing ===");
  const snapshot = await getKnowledgeSnapshot();
  assert.ok(snapshot.products.length > 0, "Expected non-empty product snapshot");

  const nonProductQueries: Array<{ query: string; expectedIntent: string }> = [
    { query: "Hi", expectedIntent: "greeting" },
    { query: "Hello ACRIO", expectedIntent: "greeting" },
    { query: "Who are you?", expectedIntent: "greeting" },
    { query: "What can you help me with?", expectedIntent: "greeting" },
    { query: "Which AI model are you using?", expectedIntent: "greeting" },
    { query: "Where is your factory?", expectedIntent: "company_info" },
    { query: "What does Classic Concepts do?", expectedIntent: "company_info" },
    { query: "Do you ship across India?", expectedIntent: "company_info" },
    { query: "I have a different query", expectedIntent: "topic_reset" },
    { query: "Forget that, let's start over", expectedIntent: "topic_reset" },
    { query: "Whom will you connect me to?", expectedIntent: "human_handoff_info" },
    { query: "Who handles custom quotes?", expectedIntent: "human_handoff_info" },
    { query: "I am an engineer", expectedIntent: "role_clarify" },
    { query: "What is the weather today?", expectedIntent: "off_topic" },
  ];

  for (const tc of nonProductQueries) {
    const res = localSmartProductMatch(snapshot, tc.query, { limit: 4 });
    assert.equal(
      res.intent,
      tc.expectedIntent,
      `Expected "${tc.query}" -> ${tc.expectedIntent}, got ${res.intent}`
    );
    assert.equal(
      isNonProductQueryIntent(res.intent),
      true,
      `Expected isNonProductQueryIntent(${res.intent}) to be true`
    );
    assert.equal(
      res.products.length,
      0,
      `Expected 0 products for "${tc.query}", got ${res.products.length}`
    );
  }
  console.log(`PASS: ${nonProductQueries.length} website non-product queries returned 0 products`);

  // Verify product query still works as expected
  const pulpitMatch = localSmartProductMatch(snapshot, "I am looking for pulpits", {
    limit: 4,
  });
  assert.equal(pulpitMatch.intent, "product_match");
  assert.ok(pulpitMatch.products.length > 0, "Expected pulpit query to return podium products");
  for (const prod of pulpitMatch.products) {
    assert.equal(
      prod.isPodium,
      true,
      `Expected pulpit match "${prod.name}" to be a podium`
    );
  }
  console.log(`PASS: Product query "I am looking for pulpits" matched ${pulpitMatch.products.length} podiums`);
  console.log("=== ALL PHASE A WEBSITE TESTS PASSED ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Phase A website test failed:", err);
  process.exit(1);
});
