# AI Architecture Implementation Progress (`ai_arch.txt`)

## Phase Status Overview
- [x] **Pre-Phase Build Fix**: Resolved `@cc/web` Ubuntu production build failure (`turbopack.root` + `outputFileTracingRoot` pinned to monorepo root; `/*turbopackIgnore: true*/` added on runtime `fs`/`path` operations).
- [x] **Phase A — Fix Intent Routing & Unnecessary Product Retrieval** *(Completed)*
- [x] **Shortlink Domain Resolution Fix (`ccapl.cc/<slug>` -> `classicconcepts.in` / `classicedge53.com`)** *(Completed)*
- [x] **Phase B — Conversation Memory & Context Management** *(Completed)*
- [x] **Phase C — Product Search Relevance, Synonym Grounding & Strict Category Isolation** *(Completed)*
- [x] **Phase D — Response Relevance, WhatsApp Handoff & Human Takeover** *(Completed)*
- [ ] **Phase E — Upgrade & Formalize ACRO Administrator Assistant Across Classic Concepts & Classic Edge 53** *(Pending)*
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

---

## Phase C — Product Retrieval, Catalog Filtering, Business Routing, Budget Enforcement & Product Relevance — Completed Summary

### What Was Fixed
1. **Strict Business Routing, Category Isolation, Inline Negation & Budget Enforcement (`ccwhatsapp`)**:
   - Upgraded `searchEcosystemItems()` in `packages/database/src/clients.ts`:
     - **Business Routing**: Enforces hard separation between `CLASSIC_CONCEPTS` (retail display, stage podiums/pulpits, trophies/awards, hotel & home accessories) and `CLASSIC_EDGE_53` (acrylic diamond edge polishers, strip heaters/benders, laser/CNC machines, thermoforming ovens, and fabrication consumables).
     - **Category / Product-Family Isolation**:
       - `podium` / `pulpit` / `lectern` / `rostrum` queries strictly require podium title/category/code (`^ccp\d`) and exclude trays, donation boxes, tubes, trophies, and machines.
       - `award` / `trophy` / `memento` / `plaque` queries strictly isolate to Awards & Trophies and exclude podiums, trays, and machines.
       - `tray` / `tissue` / `coaster` queries strictly exclude podiums, trophies, and machines.
     - **Inline Negation Filtering**: Queries containing `"not looking for tools, just machines"`, `"no consumables"`, `"without blades"`, or `"only machines"` automatically strip negated tokens before scoring and exclude `CONSUMABLE` items (returning `0` consumables and only `MACHINE` items).
     - **Strict Budget Enforcement (No Unpriced or Over-Budget Leaks)**: When `maxPrice` or `minPrice` is active, items without a verified positive price (`basePrice === null` or `<= 0`) are excluded alongside items outside the budget range (unless `includeUnpricedOnBudget: true` is explicitly passed).
     - **Minimum Topical Relevance Threshold (`matchScore >= 14`)**: Eliminates weak description-only false matches.
   - Added `getEcosystemBudgetFallbackInfo()` in `packages/database/src/clients.ts` and wired it into `buildZeroMatchHelpfulReply()` and LLM system prompts in `packages/connections/src/index.ts`:
     - When a customer asks for an unrealistically tight budget (e.g. `"I am looking for pulpits under ₹5,000"`), ACRIO returns `0` false matches and honestly reports the lowest starting price in that category (`Acrylic Podium CCP057S` at `₹7,150`) instead of hallucinating or showing over-budget products as matches.
2. **Website Catalog Filtering, Dummy Row Exclusion & Tight-Budget Honesty (`classicconcepts`)**:
   - Excluded dummy placeholder rows (`TEST PRODUCT` / `test`) in `getKnowledgeSnapshot()` in `src/lib/ai-context.ts`.
   - Enforced strict budget filtering in `localSmartProductMatch()` so unpriced items (`effectivePrice === null` or `<= 0`) and over-budget items are never returned on budget-constrained queries.
   - Enforced minimum topical score (`score >= 16`) and explicit category isolation (`wantsPodium`, `wantsAward`, `wantsSignHolder`, `wantsBox`, `wantsHotelOrTray`).
   - Updated `localSmartProductMatch()` and `runCustomerConcierge()` in `src/lib/ai.ts` so when a budget constraint yields `0` verified within-budget products, the assistant returns `products: []` and states the lowest starting price in that category (`₹7,150` for pulpits).
3. **Classic Edge 53 Global Search Tokenization, Synonyms, Negation & Fallback Catalog (`classicedge`)**:
   - Upgraded `globalSearch()` in `src/app/actions/search.ts` to:
     - Gate non-product/non-machine queries (`"Hello"`, `"I am looking for pulpits"`) with `0` false matches.
     - Tokenize multi-word queries (`"diamond edge polishing machines"`) with domain synonym expansion (`polisher`/`polishing`/`diamond`, `bender`/`bending`/`strip heater`, `laser`/`cnc`/`router`).
     - Enforce item-type negations (`"Actually I am not looking for tools, just machines"` excludes all consumables).
     - Filter out dummy `'test'` DB rows and fall back to the built-in Classic Edge 53 machine and consumable catalog when `dev.db` has no real records.
     - Fixed pre-existing bug in `search.ts` where `consumableResults.map((c) => ...)` referenced `p.url` instead of `c.url`.

### Changed Files in Phase C
- `C:\Users\DELL\Downloads\ccwhatsapp\packages\database\src\clients.ts`
- `C:\Users\DELL\Downloads\ccwhatsapp\packages\connections\src\index.ts`
- `C:\Users\DELL\Downloads\ccwhatsapp\scripts\test-phase-c-retrieval-and-budget.ts`
- `c:\Users\DELL\Desktop\classicconcepts\src\lib\ai-context.ts`
- `c:\Users\DELL\Desktop\classicconcepts\src\lib\ai.ts`
- `c:\Users\DELL\Desktop\classicconcepts\scripts\test-phase-c-retrieval-and-budget.ts`
- `C:\Users\DELL\Desktop\classicedge\src\app\actions\search.ts`
- `C:\Users\DELL\Desktop\classicedge\scripts\test-phase-c-search.ts`

### Verification & Regression Tests Run
- `npx tsx scripts/test-phase-c-retrieval-and-budget.ts` in `ccwhatsapp`: **PASS**
- `npx tsx scripts/test-phase-b-conversation-state.ts` in `ccwhatsapp`: **PASS**
- `npx tsx scripts/test-phase-a-intent-routing.ts` in `ccwhatsapp`: **PASS**
- `npx tsx scripts/test-phase-c-retrieval-and-budget.ts` in `classicconcepts`: **PASS**
- `npx tsx scripts/test-phase-b-conversation-state.ts` in `classicconcepts`: **PASS**
- `npx tsx scripts/test-phase-a-intent-routing.ts` in `classicconcepts`: **PASS**
- `npx tsx scripts/test-phase-c-search.ts` in `classicedge`: **PASS**
- `npx tsc --noEmit` across `ccwhatsapp` (`apps/web`), `classicconcepts`, and `classicedge`: **PASS (0 errors)**

---

## Phase D — Response Relevance, WhatsApp Handoff & Human Takeover — Completed Summary

### What Was Fixed
1. **Strict Separation of Informational Handoff Questions vs Explicit Human Handoff Requests (`ccwhatsapp` & `classicconcepts`)**:
   - Expanded `HUMAN_HANDOFF_INFO` in `classifyAcrioInboundIntent()` (`packages/connections/src/index.ts`) and `localSmartProductMatch()` (`classicconcepts/src/lib/ai-context.ts`) so informational questions (`"Whom will you connect me to?"`, `"Who handles custom quotes?"`, `"Who is your sales manager?"`, `"What team will you connect me to?"`, `"Can I know who I will talk to?"`) never trigger a false handoff (`needsHumanHandoff === false`) and instead explain our Sales & Fabrication Team clearly.
   - Expanded `HUMAN_HANDOFF_REQUEST` so explicit takeover requests (`"Connect me to a human"`, `"Can you connect me to a human?"`, `"Talk to sales team"`, `"Can someone call me?"`, `"Yes, please connect me"`, `"Connect me now"`) immediately trigger human handoff (`needsHumanHandoff === true`).
2. **Response Relevance on Non-Product Turns & Context-Preserving Handoff (`ccwhatsapp` & `classicconcepts`)**:
   - In `runAcrioAutonomousTurn()` (`packages/connections/src/index.ts`) and `runCustomerConcierge()` (`classicconcepts/src/lib/ai.ts`), non-product turns (`IDENTITY_META`, `COMPANY_INFO`, `HUMAN_HANDOFF_INFO`, `TOPIC_RESET`, `GREETING`, `OFF_TOPIC`) no longer inject prior product-pitch turns into `claudeMessages` / `claudeTurns` and strip any stray `https://ccapl.cc/...` product shortlinks so `"Who are you?"`, `"Where is your factory?"`, and `"Whom will you connect me to?"` are answered cleanly with zero leaked product pitches.
   - When a customer requests a human handoff after discussing products (`"Connect me to a human"`), ACRIO preserves the active `smartCategory` (e.g. `"Podiums & Stage"`) and embeds the customer's active requirements (`product: pulpit podium, budget: up to ₹30,000, preferences: ...`) into `handoffReason` (on WhatsApp Hub) and `whatsappPrefill` (on Website Concierge).
3. **Webhook `wa_message_id` (`wamid`) Idempotency & Duplicate Prevention (`ccwhatsapp`)**:
   - Added `claimInboundWaMessageId()` in `packages/workers/src/index.ts` (backed by an in-memory claim set + SQLite `messages.wa_message_id` check) and wired it into `POST /api/webhooks/whatsapp` (`apps/web/src/app/api/webhooks/whatsapp/route.ts`) and `processInboundAutomations()`.
   - Duplicate Meta webhook retries with the same `wamid` are skipped before inserting duplicate messages, running ACRIO twice, or double-billing the ledger.
4. **Mid-Flight Human Takeover Race Protection & Post-Takeover AI Suspension (`ccwhatsapp`)**:
   - Tightened `isHandledByAcrio` in `processInboundAutomations()` (`packages/workers/src/index.ts`) to require `assigned_staff_id === 'ACRIO' && status !== 'ASSIGNED' && (!assigned_team_id || assigned_team_id === 'System (ACRIO)')`.
   - Added a pre-send ownership re-verification check immediately after `runAcrioAutonomousTurn()` completes (and before `sendWhatsAppCloudMessage()`): if a human staff member or team took over while ACRIO was generating its reply, ACRIO aborts without sending its message, billing the ledger, or overwriting `assigned_staff_id`.

### Changed Files in Phase D
- `C:\Users\DELL\Downloads\ccwhatsapp\packages\connections\src\index.ts`
- `C:\Users\DELL\Downloads\ccwhatsapp\packages\workers\src\index.ts`
- `C:\Users\DELL\Downloads\ccwhatsapp\apps\web\src\app\api\webhooks\whatsapp\route.ts`
- `C:\Users\DELL\Downloads\ccwhatsapp\scripts\test-phase-d-handoff-and-relevance.ts`
- `c:\Users\DELL\Desktop\classicconcepts\src\lib\ai-context.ts`
- `c:\Users\DELL\Desktop\classicconcepts\src\lib\ai.ts`
- `c:\Users\DELL\Desktop\classicconcepts\scripts\test-phase-d-handoff-and-relevance.ts`

### Verification & Regression Tests Run
- `npx tsx scripts/test-phase-d-handoff-and-relevance.ts` in `ccwhatsapp`: **PASS**
- `npx tsx scripts/test-phase-c-retrieval-and-budget.ts` in `ccwhatsapp`: **PASS**
- `npx tsx scripts/test-phase-b-conversation-state.ts` in `ccwhatsapp`: **PASS**
- `npx tsx scripts/test-phase-a-intent-routing.ts` in `ccwhatsapp`: **PASS**
- `npx tsx scripts/test-phase-d-handoff-and-relevance.ts` in `classicconcepts`: **PASS**
- `npx tsx scripts/test-phase-c-retrieval-and-budget.ts` in `classicconcepts`: **PASS**
- `npx tsx scripts/test-phase-b-conversation-state.ts` in `classicconcepts`: **PASS**
- `npx tsx scripts/test-phase-a-intent-routing.ts` in `classicconcepts`: **PASS**
- `npx tsc --noEmit` in `ccwhatsapp` (`apps/web`) and `classicconcepts`: **PASS (0 errors)**
