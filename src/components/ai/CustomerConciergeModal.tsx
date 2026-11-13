"use client";

import { openGlobalSearchModal } from "./GlobalSearchModal";

/**
 * Unified helper: all "Talk to ACRIO" triggers now open the clean, unified GlobalSearchModal.
 */
export function openConciergeModal(prefillQuery?: string) {
  openGlobalSearchModal(prefillQuery);
}

export function CustomerConciergeModal() {
  return null;
}
