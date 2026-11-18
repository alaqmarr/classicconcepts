/**
 * Modular barrel entrypoint for Classic Concepts AI agents (Concierge + Admin Co-Pilot).
 */
export {
  callClaudeHaiku,
  type ConciergeProductCard,
  type ConciergeResponse,
} from "./initialise.acro.ai";
export {
  runCustomerConcierge,
  runSmartCatalogSearch,
  type ConciergeHistoryTurn,
} from "./concierge.acro.ai";
export {
  sanitizeAdminUntrustedInput,
  extractVerifiedAdminFacts,
  buildDeterministicSeoMetadata,
  runAdminInlineRewrite,
  runAdminProductAutofill,
  runAdminDraftEnquiryReply,
  type VerifiedAdminFacts,
} from "./admin.acro.ai";
