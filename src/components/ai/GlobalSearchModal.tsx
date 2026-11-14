"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  X,
  Loader2,
  ArrowRight,
  Tag,
  CheckCircle2,
  RotateCcw,
  Send,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useInlineEdit } from "@/components/inline-edit/InlineEditProvider";
import type { ConciergeProductCard, ConciergeResponse } from "@/lib/ai";
import type { LocalQueryIntent } from "@/lib/ai-context";

const DISMISS_STORAGE_KEY = "cc_concierge_dismissed_until";
const THREAD_STORAGE_KEY = "cc_acrio_concierge_thread_v1";

export function openGlobalSearchModal(initialQuery?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cc:open-search", { detail: { query: initialQuery || "" } })
    );
  }
}

interface SearchApiResponse {
  intent?: LocalQueryIntent;
  products: ConciergeProductCard[];
  summary: string | null;
  matchedCategories: { name: string; slug: string }[];
  source: "ai" | "cache" | "smart-local";
  modelUsed?: string;
  engineLabel?: string;
}

interface AcrioTurnItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: ConciergeResponse;
}

const ACRIO_SEARCH_PROMPTS = [
  {
    label: "🎤 Stage or Hall Podium",
    query: "We need a clear stage podium for speeches with our logo",
  },
  {
    label: "🏨 Hotel & Banquet Stands",
    query: "I run a hotel and need podiums, menu stands, and sign holders",
  },
  {
    label: "🎓 School & College",
    query: "School auditorium podium, notice frames, and student trophies",
  },
  {
    label: "🛍️ Shop & Jewellery Display",
    query: "Clear display stands and counter holders for a retail or jewellery shop",
  },
  {
    label: "🏆 Trophies & Event Awards",
    query: "We need custom acrylic trophies, mementos, or plaques for an event",
  },
  {
    label: "📦 Check Order Status",
    query: "How can I check my order status and tracking link?",
  },
];

export function GlobalSearchModal() {
  const {
    isAdmin,
    clientAiConfigured,
    aiEnabled,
    popupEnabled,
    popupDelaySeconds,
    statusLoaded,
  } = useInlineEdit();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [acrioLoading, setAcrioLoading] = useState(false);
  const [data, setData] = useState<SearchApiResponse | null>(null);
  const [acrioTurns, setAcrioTurns] = useState<AcrioTurnItem[]>([]);
  const debounceRef = useRef<number | null>(null);
  const skipNextDebounceRef = useRef(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  // Restore open ACRIO conversation across page navigations in the same browser session
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(THREAD_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAcrioTurns(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      if (acrioTurns.length > 0) {
        sessionStorage.setItem(
          THREAD_STORAGE_KEY,
          JSON.stringify(acrioTurns.slice(-12))
        );
      } else {
        sessionStorage.removeItem(THREAD_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
    if (isOpen && acrioTurns.length > 0) {
      window.setTimeout(() => {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 40);
    }
  }, [acrioTurns, isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(
        DISMISS_STORAGE_KEY,
        String(Date.now() + 24 * 60 * 60 * 1000)
      );
    } catch {
      // Ignore storage errors
    }
  }, []);

  const executeInstantSearch = useCallback(async (q: string) => {
    const clean = q.trim();
    if (!clean) {
      setData(null);
      return;
    }

    setLoading(true);
    try {
      const url = `/api/ai/search?q=${encodeURIComponent(clean)}&limit=10`;
      const res = await fetch(url);
      const json = (await res.json()) as SearchApiResponse;
      setData(json);
    } catch {
      // Non-blocking fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const talkToAcrioInSearch = useCallback(
    async (q: string, existingTurns?: AcrioTurnItem[]) => {
      const clean = q.trim();
      if (!clean) return;
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      skipNextDebounceRef.current = true;

      const baseTurns = existingTurns ?? acrioTurns;
      const historyPayload = baseTurns.slice(-10).map((t) => ({
        role: t.role,
        text: t.text,
      }));
      const userTurn: AcrioTurnItem = {
        id: `u_${Date.now()}`,
        role: "user",
        text: clean,
      };
      setAcrioTurns((prev) => [...prev, userTurn]);
      setFollowUpInput("");
      setAcrioLoading(true);

      try {
        const conciergeRes = await fetch("/api/ai/concierge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: clean,
            history: historyPayload,
          }),
        });
        const conciergeJson = (await conciergeRes.json()) as ConciergeResponse;
        const assistantTurn: AcrioTurnItem = {
          id: `a_${Date.now()}`,
          role: "assistant",
          text: conciergeJson.message,
          response: conciergeJson,
        };
        setAcrioTurns((prev) => [...prev, assistantTurn]);
      } catch {
        // Non-blocking fallback
      } finally {
        setAcrioLoading(false);
      }
    },
    [acrioTurns]
  );

  // Global keyboard shortcut (Ctrl+K / Cmd+K) + unified open event listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    const onOpenEvent = (e: Event) => {
      const custom = e as CustomEvent<{ query?: string }>;
      setIsOpen(true);
      if (custom.detail?.query) {
        setQuery(custom.detail.query);
        void talkToAcrioInSearch(custom.detail.query);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("cc:open-search", onOpenEvent);
    window.addEventListener("cc:open-concierge", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("cc:open-search", onOpenEvent);
      window.removeEventListener("cc:open-concierge", onOpenEvent);
    };
  }, [talkToAcrioInSearch, handleClose, isOpen]);

  // Gentle entrance auto-open for first-time visitors
  useEffect(() => {
    if (!statusLoaded) return;
    if (!popupEnabled || isAdmin) return;

    try {
      const dismissedUntil = Number(
        localStorage.getItem(DISMISS_STORAGE_KEY) || "0"
      );
      if (dismissedUntil > Date.now()) return;
    } catch {
      // Ignore storage restrictions
    }

    const delayMs = Math.max(1500, (popupDelaySeconds || 3) * 1000);
    const timer = window.setTimeout(() => {
      setIsOpen(true);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [statusLoaded, popupEnabled, popupDelaySeconds, isAdmin]);

  // Instant debounced local/cached catalog search while typing in top search bar (keeps ACRIO conversation intact!)
  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false;
      return;
    }

    if (!query.trim()) {
      setData(null);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      void executeInstantSearch(query);
    }, 220);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, executeInstantSearch]);

  const latestAssistantTurn = [...acrioTurns]
    .reverse()
    .find((t) => t.role === "assistant" && t.response);
  const acrioReply = latestAssistantTurn?.response || null;

  const displayProducts =
    query.trim() && data?.products?.length
      ? data.products
      : acrioReply?.products || [];

  const isClaudeActive = clientAiConfigured && aiEnabled;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-5 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-slate-900 via-[#003d82] to-[#0056b3] text-white text-xs sm:text-sm font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all border border-white/20 print:hidden cursor-pointer"
          aria-label="Talk to ACRIO"
        >
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            {acrioTurns.length > 0 ? "Continue Chat with ACRIO" : "Talk to ACRIO"}
          </span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-6 sm:pt-14 px-3 sm:px-6 pb-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Unified Search + ACRIO Input Header */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) {
                  void talkToAcrioInSearch(query);
                  setQuery("");
                }
              }}
              className="p-3 sm:p-4 border-b border-slate-200 flex items-center gap-2 bg-gradient-to-r from-slate-50 via-white to-blue-50/40"
            >
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-extrabold shrink-0">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>ACRIO</span>
              </div>
              <Search className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, order IDs, or ask ACRIO in plain words..."
                className="flex-1 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none min-w-0"
                autoFocus={acrioTurns.length === 0}
              />
              {query.trim().length > 1 && (
                <button
                  type="submit"
                  disabled={acrioLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0056b3] to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shrink-0 transition-all shadow-2xs cursor-pointer"
                >
                  {acrioLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{acrioLoading ? "Thinking..." : "Ask ACRIO"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </form>

            {/* Live AI Engine Transparency Bar */}
            {statusLoaded && (
              <div className="px-4 py-1.5 bg-slate-50/90 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isClaudeActive ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span>
                    Active Engine:{" "}
                    <strong className="text-slate-800">
                      {isClaudeActive
                        ? "Claude Haiku 5.5 (Live AI)"
                        : !clientAiConfigured
                          ? "Local Catalog Match (Client AI Key Not Set)"
                          : "Local Catalog Match (AI Paused)"}
                    </strong>
                  </span>
                </div>
                {isAdmin && !isClaudeActive && (
                  <Link
                    href="/admin/settings"
                    onClick={handleClose}
                    className="text-[#0056b3] hover:underline font-bold"
                  >
                    Configure AI Key &rarr;
                  </Link>
                )}
              </div>
            )}

            {/* Results & Persistent Multi-Turn ACRIO Conversation Area */}
            <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-5 space-y-4">
              {!query.trim() && acrioTurns.length === 0 && (
                <div className="space-y-5 py-1">
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-[#002b5e] to-[#0056b3] text-white space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-amber-300 text-[11px] font-bold">
                        <Sparkles className="w-3 h-3" />
                        Talk to ACRIO Directly in Search
                      </span>
                      <span className="text-[11px] text-blue-200 hidden sm:inline">
                        Since 2008 • Factory Direct
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                      Type a product name, Order ID, or tell ACRIO what you want to display or build:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ACRIO_SEARCH_PROMPTS.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => void talkToAcrioInSearch(item.query)}
                          className="text-left px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <span className="truncate">{item.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Popular Searches
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Clear Acrylic Podium",
                        "LED Conference Lectern",
                        "Wooden & Acrylic Podium",
                        "Brochure & Menu Holders",
                        "Acrylic Trophy",
                        "Donation / Suggestion Box",
                        "Cosmetic & Jewellery Stand",
                      ].map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => void talkToAcrioInSearch(term)}
                          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0056b3] text-xs font-medium transition-colors cursor-pointer"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Persistent Multi-Turn ACRIO Chat Thread */}
              {acrioTurns.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/80 border border-indigo-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap border-b border-indigo-100 pb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        ACRIO Live Chat
                      </span>
                      {acrioReply?.engineLabel && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            acrioReply.source === "ai" || acrioReply.source === "cache"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-amber-50 border-amber-200 text-amber-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              acrioReply.source === "ai" || acrioReply.source === "cache"
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {acrioReply.engineLabel}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAcrioTurns([]);
                        setFollowUpInput("");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear Chat</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {acrioTurns.map((turn) => (
                      <div
                        key={turn.id}
                        className={`flex ${
                          turn.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed ${
                            turn.role === "user"
                              ? "bg-[#0056b3] text-white font-medium"
                              : "bg-white border border-slate-200 text-slate-800 shadow-2xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{turn.text}</p>
                          {turn.response?.highlights &&
                            turn.response.highlights.length > 0 && (
                              <ul className="mt-2 space-y-1 border-t border-slate-100 pt-1.5">
                                {turn.response.highlights.map((h, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-1.5 text-xs text-slate-600"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{h}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                        </div>
                      </div>
                    ))}
                    {acrioLoading && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl px-3.5 py-2 bg-white border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0056b3]" />
                          <span>ACRIO is replying...</span>
                        </div>
                      </div>
                    )}
                    <div ref={threadEndRef} />
                  </div>

                  {isAdmin && acrioReply?.aiDiagnostic && (
                    <p className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-lg px-2.5 py-1.5">
                      <strong>Admin Note:</strong> {acrioReply.aiDiagnostic}
                    </p>
                  )}

                  {acrioReply?.followUpChips && acrioReply.followUpChips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Quick reply:
                      </span>
                      {acrioReply.followUpChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          disabled={acrioLoading}
                          onClick={() => void talkToAcrioInSearch(chip)}
                          className="px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 border border-indigo-200 text-[11px] font-semibold text-indigo-800 transition-colors cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Dedicated Follow-Up Input Bar so conversation stays open */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (followUpInput.trim()) {
                        void talkToAcrioInSearch(followUpInput);
                      }
                    }}
                    className="flex items-center gap-2 pt-1"
                  >
                    <input
                      type="text"
                      value={followUpInput}
                      onChange={(e) => setFollowUpInput(e.target.value)}
                      placeholder="Reply to ACRIO to narrow down size, quantity, or budget..."
                      className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/30"
                    />
                    <button
                      type="submit"
                      disabled={acrioLoading || !followUpInput.trim()}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#0056b3] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </form>

                  {acrioReply && (
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-indigo-100">
                      <div className="flex flex-wrap gap-1.5">
                        {acrioReply.suggestedLinks?.slice(0, 2).map((lnk) => (
                          <Link
                            key={lnk.href}
                            href={lnk.href}
                            onClick={handleClose}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors"
                          >
                            <span>{lnk.label}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ))}
                      </div>
                      <a
                        href={`https://wa.me/${(
                          acrioReply.whatsappNumber || "+917337222876"
                        ).replace(/\D/g, "")}?text=${encodeURIComponent(
                          acrioReply.whatsappPrefill ||
                            `Hi Classic Concepts, I need help choosing an acrylic product.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1da851] hover:bg-[#158c42] text-white text-[11px] font-bold transition-colors shadow-2xs"
                      >
                        <WhatsAppIcon size={14} className="shrink-0" />
                        <span>Continue on WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {loading && !data && acrioTurns.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-600 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0056b3]" />
                  <span>Searching catalog...</span>
                </div>
              )}

              {query.trim() && data?.summary && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs sm:text-sm text-indigo-950 flex items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{data.summary}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void talkToAcrioInSearch(query);
                      setQuery("");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold shrink-0 hover:bg-indigo-700 cursor-pointer"
                  >
                    Ask ACRIO
                  </button>
                </div>
              )}

              {displayProducts.length > 0 &&
                data?.matchedCategories &&
                data.matchedCategories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Categories:
                    </span>
                    {data.matchedCategories.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/shop/c/${c.slug}`}
                        onClick={handleClose}
                        className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0056b3] text-xs font-bold hover:bg-[#0056b3] hover:text-white transition-colors"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}

              {displayProducts.length > 0 && (
                <div className="divide-y divide-slate-100">
                  {displayProducts.map((prod) => (
                    <Link
                      key={prod.id}
                      href={`/shop/p/${prod.slug}`}
                      onClick={handleClose}
                      className="flex items-center gap-3.5 py-3 px-2 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={prod.mainImage || "/short-logo.png"}
                        alt={prod.name}
                        className="w-14 h-14 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0056b3]">
                            {prod.subCategoryName || prod.categoryName}
                          </span>
                          {prod.sku && (
                            <span className="text-[10px] text-slate-400">
                              SKU: {prod.sku}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0056b3] truncate">
                          {prod.name}
                        </h4>
                        {prod.reason && (
                          <p className="text-xs text-slate-500 truncate">
                            {prod.reason}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {prod.effectivePrice ? (
                          <span className="text-sm font-extrabold text-slate-900">
                            ₹{prod.effectivePrice.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">
                            Enquire
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#0056b3] ml-auto mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {query.trim() &&
                !loading &&
                !acrioLoading &&
                data &&
                data.intent === "no_match" &&
                displayProducts.length === 0 && (
                  <div className="py-6 text-center space-y-3">
                    <p className="text-sm text-slate-600">
                      No exact catalog item matched &ldquo;{query}&rdquo;.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void talkToAcrioInSearch(query);
                        setQuery("");
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0056b3] text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Ask ACRIO About Custom Work</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
