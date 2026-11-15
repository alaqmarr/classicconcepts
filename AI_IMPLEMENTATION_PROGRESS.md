# AI Architecture Implementation Progress (`ai_arch.txt`)

## Phase Status Overview
- [x] **Pre-Phase Build Fix**: Resolved `@cc/web` Ubuntu production build failure (`turbopack.root` + `outputFileTracingRoot` pinned to monorepo root; `/*turbopackIgnore: true*/` added on runtime `fs`/`path` operations).
- [x] **Phase A — Fix Intent Routing & Unnecessary Product Retrieval** *(Completed)*
- [x] **Shortlink Domain Resolution Fix (`ccapl.cc/<slug>` -> `classicconcepts.in` / `classicedge53.com`)** *(Completed)*
- [x] **Phase B — Conversation Memory & Context Management** *(Completed)*
- [ ] **Phase C — Product Search Relevance, Synonym Grounding & Strict Category Isolation** *(Pending)*
- [ ] **Phase D — Fix Human Handoff State Machine & Ownership Rules** *(Pending)*
- [ ] **Phase E — Fix WhatsApp Template Drafter & Outbound Message Formatting** *(Pending)*
- [ ] **Phase F — Complete End-to-End `ai.logs` & `/dashboard/ai-logs` Observability** *(Pending)*
- [ ] **Phase G — Add Evaluation & Regression Test Suite** *(Pending)*

---

## Phase A — Completed Summary

### What Was Fixed
1. **Deterministic Turn-Level Intent Router Before Retrieval (`ccwhatsapp`)**:
   - Added `classifyAcrioInboundIntent(rawText, hasConversationHistory)` in `packages/connections/src/index.ts`.
   - Classifies turns into explicit intents before touching `getCachedEcosystemCatalog()` or `searchEcosystemItems()`.
   - Updated `runAcrioAutonomousTurn` and `runAcrioChatCopilot` so catalog lookup only executes when `requiresProductLookup === true`.
   - Accurate `ai.logs` telemetry: non-product turns record `productLookupTriggered: false`, `productLookupQuery: ""`, `productLookupTotalScanned: 0`, and `productsLookedUp: []`.
2. **Website Intent Router & Retrieval Gate (`classicconcepts`)**:
   - Extended `LocalQueryIntent` and added `isNonProductQueryIntent()` in `src/lib/ai-context.ts` to cover `greeting`, `role_clarify`, `company_info`, `topic_reset`, `human_handoff_info`, and `off_topic` before lexical product scoring.
   - Updated `runCustomerConcierge` and `runSmartCatalogSearch` in `src/lib/ai.ts` to pre-classify visitor turns and skip unnecessary product lookups.

---

## Shortlink Domain Resolution Fix (`ccapl.cc/<slug>`) — Completed Summary

### What Was Fixed
- Updated `classicconcepts/src/app/api/whatsapp-catalog/route.ts` and `classicedge/src/app/api/whatsapp-catalog/route.ts` so catalog bridges never derive public product URLs from internal `localhost:3003` or `localhost:3002` request headers, always emitting `https://classicconcepts.in` and `https://classicedge53.com`.
- Added `normalizePublicEcosystemUrl()` in `packages/database/src/clients.ts` and `normalizePublicDestinationUrl()` in `packages/storage/src/index.ts` and `apps/web/src/app/l/[code]/route.ts`.
- Auto-healed all 411 existing `custom_links` rows in `conversations.db` so every `ccapl.cc/<code-or-slug>` redirect resolves strictly to `https://classicconcepts.in` or `https://classicedge53.com`.

---

## Phase B — Conversation Memory & Context Management — Completed Summary

### What Was Fixed
1. **Structured Per-Conversation State (`AcrioConversationState`) & SQLite Persistence (`ccwhatsapp`)**:
   - Added `AcrioConversationState`, `createEmptyAcrioConversationState()`, `applyTurnToAcrioConversationState()`, `reconstructAcrioConversationState()`, `buildNormalizedSearchFromState()`, `loadConversationAiState()`, and `saveConversationAiState()` in `packages/connections/src/index.ts`.
   - Persists conversation state per customer in `conversations.ai_state_json` (keyed by `conversationId`, passed from `packages/workers/src/index.ts`), ensuring strict isolation between customers.
   - Tracks `activeBrand`, `activeCategory`, `productFamily`, `primaryProductQuery`, `itemTypeFilter`, `excludedItemTypes`, `minPrice`, `maxPrice`, `preferences`, `applicationContext`, `dimensionsOrThickness`, `quantity`, and `lastRecommendedProducts`.
2. **Follow-Up Budget Updates, Preference Refinements & Negations (`ccwhatsapp`)**:
   - Upgraded `extractBudgetConstraintsFromQuery()` in `packages/database/src/clients.ts` to parse `"increase the budget to ₹30,000"`, `"stretch/raise/extend budget to 30k"`, `"budget to ₹30,000"`, `"make it ₹30,000"`, `"under ₹25,000"`, and `"between ₹15,000 and ₹30,000"`, always selecting the latest budget in multi-turn windows.
   - Upgraded `searchEcosystemItems()` in `packages/database/src/clients.ts` to accept `EcosystemSearchOptions` (`minPrice`, `maxPrice`, `brand`, `itemType`, `excludedItemTypes`, `preferPremium`).
   - Specifically fixed the multi-turn pulpit scenario:
     - Turn 1: `"I am looking for pulpits under ₹25,000"` -> `productFamily="podium"`, `primaryProductQuery="pulpit podium"`, `maxPrice=25000` (returns only podiums `<= ₹25,000`).
     - Turn 2: `"We can increase the budget to ₹30,000"` -> preserves `productFamily="podium"`, `primaryProductQuery="pulpit podium"`, `activeCategory="Podiums & Stage"`, and updates `maxPrice=30000` (unlocking podiums in the `₹25,001–₹30,000` range with zero unrelated categories).
     - Turn 3: `"Show me the most premium transparent ones"` -> preserves podium category and `maxPrice=30000`, adds `preferences=["premium", "transparent"]`, and sorts the highest-priced within-budget podium (`₹29,700`) first.
   - Added negation/correction handling (`"Actually I am not looking for tools, just machines"` sets `itemTypeFilter="MACHINE"` and `excludedItemTypes=["CONSUMABLE"]` while preserving the active machine query).
   - Added clean topic-switch and explicit topic-reset handling so switching from pulpits to trophies/machines or saying `"I have a different query"` clears stale category and budget constraints.
3. **Website Multi-Turn Conversation State (`classicconcepts`)**:
   - Added `extractWebsiteBudgetConstraints()` and `deriveWebsiteConversationState()` in `src/lib/ai-context.ts` and upgraded `localSmartProductMatch()` to enforce strict `maxPrice` / `minPrice` ceilings and `preferPremium` sorting.
   - Updated `runCustomerConcierge()` in `src/lib/ai.ts` to reconstruct multi-turn visitor state (`cleanHistory` + `cleanQuery`), preserving product category and updated budgets across follow-up turns.

### Changed Files in Phase B
- `C:\Users\DELL\Downloads\ccwhatsapp\packages\database\src\clients.ts`
- `C:\Users\DELL\Downloads\ccwhatsapp\packages\connections\src\index.ts`
- `C:\Users\DELL\Downloads\ccwhatsapp\packages\workers\src\index.ts`
- `C:\Users\DELL\Downloads\ccwhatsapp\scripts\test-phase-b-conversation-state.ts`
- `c:\Users\DELL\Desktop\classicconcepts\src\lib\ai-context.ts`
- `c:\Users\DELL\Desktop\classicconcepts\src\lib\ai.ts`
- `c:\Users\DELL\Desktop\classicconcepts\scripts\test-phase-b-conversation-state.ts`

### Verification & Regression Tests Run
- `npx tsx scripts/test-phase-b-conversation-state.ts` in `ccwhatsapp`: **PASS**
- `npx tsx scripts/test-phase-a-intent-routing.ts` in `ccwhatsapp`: **PASS**
- `npx tsx scripts/test-phase-b-conversation-state.ts` in `classicconcepts`: **PASS**
- `npx tsx scripts/test-phase-a-intent-routing.ts` in `classicconcepts`: **PASS**
- `npx tsc --noEmit` in `ccwhatsapp` (`apps/web`) and `classicconcepts`: **PASS (0 errors)**
