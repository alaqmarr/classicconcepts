"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Search,
  X,
  ArrowRight,
  Loader2,
  Package,
  Layers,
  Mic2,
  Send,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
function buildWhatsAppHref(rawNumber: string, text: string) {
  const digits = rawNumber.replace(/\D/g, "") || "919393939773";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function openGlobalSearchModal(initialQuery?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("cc:open-search", {
        detail: { query: initialQuery || "", autoAsk: Boolean(initialQuery) },
      })
    );
  }
}

type SearchProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  priceType: string;
  categoryName: string;
  podiumSubCategory: string | null;
  imageUrl: string | null;
  reason?: string;
};

type SearchCategory = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

type AcrioReply = {
  intent?: string;
  message: string;
  highlights?: string[];
  followUpChips?: string[];
  suggestedLinks?: { label: string; href: string }[];
  whatsappPrefill?: string;
  products: SearchProduct[];
  matchedCategories: SearchCategory[];
};

type ConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

const QUICK_PROMPTS = [
  "Clear podium for stage or school",
  "Gifts & trophies for students under ₹1,000",
  "Shop & counter display stands",
  "Suggestion or lucky draw box with lock",
  "Office desk nameplates & sign holders",
  "Custom size acrylic cover or box",
];

export function GlobalSearchModal({
  whatsappNumber = "919393939773",
}: {
  whatsappNumber?: string;
  isAdmin?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [acrioLoading, setAcrioLoading] = useState(false);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [categories, setCategories] = useState<SearchCategory[]>([]);
  const [acrioReply, setAcrioReply] = useState<AcrioReply | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [lastAskedQuery, setLastAskedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const openModal = useCallback((initialQuery?: string) => {
    setIsOpen(true);
    if (typeof initialQuery === "string" && initialQuery.trim()) {
      setQuery(initialQuery.trim());
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetConversation = useCallback(() => {
    setConversationHistory([]);
    setAcrioReply(null);
    setLastAskedQuery("");
    setQuery("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  }, []);

  const askAcrio = useCallback(
    async (promptText?: string, forceFresh?: boolean) => {
      const q = (promptText ?? query).trim();
      if (q.length < 2) return;
      if (promptText) setQuery(q);

      const isResetPhrase =
        forceFresh ||
        /\b(different query|another question|start over|new question|something else|other query|change topic|reset)\b/i.test(
          q
        );

      const historyToSend = isResetPhrase ? [] : conversationHistory.slice(-8);

      setAcrioLoading(true);
      setLastAskedQuery(q);
      try {
        const res = await fetch("/api/ai/concierge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            history: historyToSend,
          }),
        });
        const data = await res.json();
        if (res.ok && data) {
          setAcrioReply({
            intent: data.intent,
            message: data.message || "",
            highlights: Array.isArray(data.highlights) ? data.highlights : [],
            followUpChips: Array.isArray(data.followUpChips) ? data.followUpChips : [],
            suggestedLinks: Array.isArray(data.suggestedLinks) ? data.suggestedLinks : [],
            whatsappPrefill: data.whatsappPrefill,
            products: Array.isArray(data.products) ? data.products : [],
            matchedCategories: Array.isArray(data.matchedCategories)
              ? data.matchedCategories
              : [],
          });
          if (Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
          } else if (
            data.intent &&
            data.intent !== "product_match"
          ) {
            setProducts([]);
          }
          if (Array.isArray(data.matchedCategories) && data.matchedCategories.length > 0) {
            setCategories(data.matchedCategories);
          }

          setConversationHistory((prev) => {
            const base = isResetPhrase ? [] : prev.slice(-6);
            return [
              ...base,
              { role: "user", text: q },
              { role: "assistant", text: String(data.message || "") },
            ];
          });
        }
      } catch {
        // Ignore network error, instant search results still work
      } finally {
        setAcrioLoading(false);
      }
    },
    [query, conversationHistory]
  );

  // Listen for custom open event or Cmd/Ctrl+K
  useEffect(() => {
    const handleCustomOpen = (event: Event) => {
      const custom = event as CustomEvent<{ query?: string; autoAsk?: boolean }>;
      const initialQ = custom.detail?.query || "";
      openModal(initialQ);
      if (initialQ && custom.detail?.autoAsk !== false) {
        setTimeout(() => {
          askAcrio(initialQ);
        }, 80);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        closeModal();
      }
    };

    window.addEventListener("cc:open-search", handleCustomOpen);
    window.addEventListener("cc:open-concierge", handleCustomOpen);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("cc:open-search", handleCustomOpen);
      window.removeEventListener("cc:open-concierge", handleCustomOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, openModal, closeModal, askAcrio]);

  // Debounced instant catalog search while typing
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setProducts([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      } catch {
        setProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Auto-trigger ACRIO guide after a pause when typing a question or phrase
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (trimmed.length < 3 || trimmed === lastAskedQuery) return;

    const timer = setTimeout(() => {
      askAcrio(trimmed);
    }, 650);

    return () => clearTimeout(timer);
  }, [query, isOpen, lastAskedQuery, askAcrio]);

  const pathname = usePathname() || "";
  const isProductDetailPage = pathname.startsWith("/shop/p/");

  return (
    <>
      {/* Floating ACRIO Search & Product Assistant Pill (hidden on /shop/p/[slug] where it is integrated into the sticky bottom bar) */}
      {!isProductDetailPage && (
        <div className="fixed bottom-4 left-3 sm:bottom-6 sm:left-6 z-50">
          <button
            type="button"
            onClick={() => openModal()}
            className="group flex items-center gap-2.5 bg-[#0c1a40] hover:bg-[#0056b3] text-white pl-3 pr-4 py-2.5 rounded-full shadow-lg border border-white/15 transition-all hover:scale-[1.02]"
            aria-label="Ask ACRIO or search acrylic products"
          >
            <span className="w-8 h-8 rounded-full bg-[#0056b3] group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <div className="text-left leading-tight">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-300">
                ACRIO Product Assistant
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white">
                Search &amp; Find Products
              </span>
            </div>
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/65 backdrop-blur-xs flex items-start justify-center pt-3 sm:pt-10 px-2 sm:px-4 pb-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Top Brand Header */}
            <div className="bg-[#0c1a40] px-4 sm:px-6 py-3.5 text-white flex items-center justify-between gap-3 border-b border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#0056b3] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-extrabold tracking-tight">
                      ACRIO Product Search &amp; Guide
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-sky-200 px-2 py-0.5 rounded-full">
                      Classic Concepts Catalog
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    Search by product name, SKU, size, or describe what you need in plain words
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {conversationHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={resetConversation}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Start a fresh question"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New Topic</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search / Question Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                askAcrio();
              }}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 border-b border-slate-200 bg-slate-50"
            >
              <Search className="w-5 h-5 text-[#0056b3] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  conversationHistory.length > 0
                    ? "Ask a follow-up (e.g. 'under ₹1,500', 'with lock', or type a new item)..."
                    : "Search products or ask (e.g. 'clear podium for school', 'gift under ₹1,000')..."
                }
                className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base font-medium focus:outline-none"
              />
              {(loading || acrioLoading) && (
                <Loader2 className="w-4 h-4 text-[#0056b3] animate-spin shrink-0" />
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setAcrioReply(null);
                    setLastAskedQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-slate-200/70 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                disabled={query.trim().length < 2 || acrioLoading}
                className="inline-flex items-center gap-1.5 bg-[#0056b3] hover:bg-[#004494] disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors shrink-0 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask</span>
              </button>
            </form>

            {/* Body */}
            <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Quick Starter Prompts when input is empty */}
              {query.trim().length < 2 && !acrioReply ? (
                <div className="space-y-5">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0056b3] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      <span className="font-bold text-slate-900 block mb-0.5">
                        Tell us what you are looking for
                      </span>
                      Type a product name, SKU code (like{" "}
                      <span className="font-semibold text-slate-900">CCP055</span>), budget, or
                      purpose below. We will show matching ready items from our catalog or connect
                      you with our factory team for custom sizes.
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                      Popular Searches
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {QUICK_PROMPTS.map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => {
                            setQuery(text);
                            askAcrio(text);
                          }}
                          className="flex items-center justify-between gap-2 text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-[#0056b3] hover:bg-blue-50/40 text-xs sm:text-sm font-semibold text-slate-700 hover:text-[#0056b3] transition-all group"
                        >
                          <span className="truncate">{text}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0056b3] shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href="/podiums"
                        onClick={closeModal}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056b3] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Mic2 className="w-3.5 h-3.5" /> Explore All Podiums
                      </Link>
                      <Link
                        href="/shop"
                        onClick={closeModal}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Package className="w-3.5 h-3.5" /> Browse Full Shop
                      </Link>
                    </div>
                    <a
                      href={buildWhatsAppHref(
                        whatsappNumber,
                        "Hi Classic Concepts! I need help choosing the right acrylic product."
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Chat on WhatsApp
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  {/* ACRIO Conversational Answer Box */}
                  {(acrioLoading || acrioReply?.message) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      {conversationHistory.length > 2 && (
                        <div className="space-y-1.5 pb-2.5 border-b border-slate-200/80 max-h-28 overflow-y-auto">
                          {conversationHistory.slice(-4, -2).map((turn, idx) => (
                            <div
                              key={idx}
                              className={`text-[11px] leading-snug ${
                                turn.role === "user"
                                  ? "text-slate-600 font-semibold"
                                  : "text-slate-500"
                              }`}
                            >
                              <span className="uppercase tracking-wider text-[9px] font-bold mr-1.5 text-slate-400">
                                {turn.role === "user" ? "You:" : "ACRIO:"}
                              </span>
                              {turn.text}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#0056b3] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3" /> ACRIO Recommendation
                          </span>
                        </div>
                        {acrioReply?.whatsappPrefill && (
                          <a
                            href={buildWhatsAppHref(whatsappNumber, acrioReply.whatsappPrefill)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#25D366] hover:bg-[#1ebe57] px-2.5 py-1 rounded-lg transition-colors shrink-0 shadow-xs"
                          >
                            <MessageCircle className="w-3 h-3" /> Ask on WhatsApp
                          </a>
                        )}
                      </div>

                      {acrioLoading && !acrioReply ? (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 py-1">
                          <Loader2 className="w-4 h-4 text-[#0056b3] animate-spin" />
                          Checking our catalog for the best matches...
                        </div>
                      ) : (
                        <>
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                            {acrioReply?.message}
                          </p>

                          {acrioReply?.highlights && acrioReply.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {acrioReply.highlights.map((h, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Clickable Follow-Up Question Chips */}
                          {acrioReply?.followUpChips && acrioReply.followUpChips.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/80">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Quick Follow-Ups:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {acrioReply.followUpChips.map((chip, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      const isReset =
                                        /different query|another question|start over/i.test(chip);
                                      if (isReset) {
                                        resetConversation();
                                      } else {
                                        setQuery(chip);
                                        askAcrio(chip);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0056b3] bg-white hover:bg-[#0056b3] hover:text-white border border-slate-200 hover:border-[#0056b3] px-2.5 py-1 rounded-full transition-colors shadow-2xs"
                                  >
                                    {chip}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Suggested Quick Links */}
                          {acrioReply?.suggestedLinks && acrioReply.suggestedLinks.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {acrioReply.suggestedLinks.map((link, idx) => (
                                <Link
                                  key={idx}
                                  href={link.href}
                                  onClick={closeModal}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0056b3] bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg transition-colors"
                                >
                                  {link.label} <ArrowRight className="w-3 h-3" />
                                </Link>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Categories */}
                  {categories.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Matching Categories
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                          <Link
                            key={cat.id}
                            href={cat.slug === "podiums" ? "/podiums" : `/shop/c/${cat.slug}`}
                            onClick={closeModal}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#0056b3] text-slate-800 hover:text-white text-xs font-bold transition-colors"
                          >
                            <span>{cat.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/80 text-slate-700">
                              {cat.count}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Recommended Products ({products.length})
                      </p>
                      {products.length > 0 && (
                        <Link
                          href={`/shop?q=${encodeURIComponent(query.trim())}`}
                          onClick={closeModal}
                          className="text-xs font-bold text-[#0056b3] hover:underline flex items-center gap-1"
                        >
                          Open in Shop <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    {products.length === 0 && !loading && !acrioLoading ? (
                      <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200 px-4">
                        {acrioReply?.intent && acrioReply.intent !== "product_match" ? (
                          <>
                            <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                              Tell us which product or setup you have in mind above, or pick a
                              follow-up chip.
                            </p>
                            <p className="text-xs text-slate-500">
                              You can also browse our full catalog or message our factory team on
                              WhatsApp.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-slate-800 mb-1">
                              Need a custom size or fabrication for &ldquo;{query}&rdquo;?
                            </p>
                            <p className="text-xs text-slate-500 mb-3">
                              We custom fabricate acrylic stands, covers, boxes, and podiums to your
                              exact drawing and dimensions at our Secunderabad factory.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <a
                                href={buildWhatsAppHref(
                                  whatsappNumber,
                                  `Hi Classic Concepts! I am looking for: ${query}. Can you share options and pricing?`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#25D366] hover:bg-[#1ebe57] text-white px-4 py-2 rounded-lg transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> Get Price on WhatsApp
                              </a>
                              <Link
                                href="/contact"
                                onClick={closeModal}
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0056b3] text-white px-4 py-2 rounded-lg hover:bg-[#004494] transition-colors"
                              >
                                Request Custom Quote <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {products.map((product) => (
                          <div
                            key={product.id}
                            className="flex flex-col justify-between p-2.5 rounded-xl border border-slate-200 hover:border-[#0056b3] hover:bg-blue-50/30 transition-all group bg-white"
                          >
                            <Link
                              href={`/shop/p/${product.slug}`}
                              onClick={closeModal}
                              className="flex items-center gap-3"
                            >
                              <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                                {product.imageUrl ? (
                                  <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fill
                                    sizes="56px"
                                    className="object-contain p-1 group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <Package className="w-6 h-6 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0056b3] truncate">
                                  {product.name}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {product.categoryName}
                                </p>
                                <p className="text-xs font-extrabold text-[#0056b3] mt-0.5">
                                  {product.priceType === "FIXED" && product.price > 0
                                    ? `₹${product.price.toLocaleString("en-IN")}`
                                    : "Custom Quote / POA"}
                                </p>
                              </div>
                            </Link>
                            {product.reason && (
                              <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 mt-2 leading-snug">
                                {product.reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
