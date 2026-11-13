"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  Loader2,
  X,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useInlineEdit } from "@/components/inline-edit/InlineEditProvider";
import type { ConciergeProductCard, ConciergeResponse } from "@/lib/ai";

interface ShopSmartSearchBarProps {
  onlyPodiums?: boolean;
  placeholder?: string;
}

const QUICK_PROMPTS_ALL = [
  "Stage podium with our logo",
  "Hotel & restaurant menu stands",
  "Clear display stands for shop",
  "Custom acrylic trophies",
];

const QUICK_PROMPTS_PODIUMS = [
  "Clear podium for auditorium speeches",
  "Podium with LED light & logo",
  "Wide-top pulpit for church or college",
  "Easy-to-move podium for seminars",
];

export function ShopSmartSearchBar({
  onlyPodiums = false,
  placeholder = "Search products, SKU, or talk to ACRIO in your own words...",
}: ShopSmartSearchBarProps) {
  const { isAdmin } = useInlineEdit();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ConciergeProductCard[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [acrioData, setAcrioData] = useState<ConciergeResponse | null>(null);

  const runAcrioSearch = async (overrideQuery?: string) => {
    const clean = (overrideQuery ?? query).trim();
    if (!clean) {
      setResults(null);
      setSummary(null);
      setAcrioData(null);
      return;
    }
    if (overrideQuery !== undefined) {
      setQuery(clean);
    }
    setLoading(true);
    try {
      const conciergeRes = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: onlyPodiums ? `${clean}` : clean,
        }),
      });
      const conciergeJson = (await conciergeRes.json()) as ConciergeResponse;

      if (conciergeJson.intent && conciergeJson.intent !== "product_match") {
        setResults([]);
        setSummary(conciergeJson.message || null);
        setAcrioData(conciergeJson);
        return;
      }

      if (onlyPodiums) {
        const searchRes = await fetch(
          `/api/ai/search?q=${encodeURIComponent(clean)}&limit=12&podiums=1`
        );
        const searchJson = await searchRes.json();
        const searchProducts: ConciergeProductCard[] = Array.isArray(
          searchJson.products
        )
          ? searchJson.products
          : [];
        setResults(searchProducts);
        setSummary(conciergeJson.message || searchJson.summary || null);
        setAcrioData(conciergeJson);
      } else {
        setResults(conciergeJson.products || []);
        setSummary(conciergeJson.message || null);
        setAcrioData(conciergeJson);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const quickChips = onlyPodiums ? QUICK_PROMPTS_PODIUMS : QUICK_PROMPTS_ALL;

  return (
    <div className="mb-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runAcrioSearch();
        }}
        className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-2.5 bg-white p-2 rounded-2xl shadow-md border border-slate-200"
      >
        <div className="flex-1 flex items-center gap-2.5 px-2.5 py-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-extrabold shrink-0">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            <span>ACRIO</span>
          </span>
          <Search className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setResults(null);
                setSummary(null);
                setAcrioData(null);
              }
            }}
            placeholder={placeholder}
            className="w-full text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults(null);
                setSummary(null);
                setAcrioData(null);
              }}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0056b3] to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-300" />
          )}
          <span>{loading ? "Asking ACRIO..." : "Talk to ACRIO"}</span>
        </button>
      </form>

      {/* Quick 1-click ACRIO prompts directly beneath the search bar */}
      {results === null && (
        <div className="max-w-3xl mx-auto mt-2.5 flex flex-wrap items-center justify-center gap-1.5 px-2">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">
            Talk to ACRIO:
          </span>
          {quickChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => void runAcrioSearch(chip)}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-[11px] font-medium text-slate-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {results !== null && (
        <div className="max-w-5xl mx-auto mt-5 p-4 sm:p-6 rounded-3xl bg-white border border-indigo-200 shadow-lg space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap text-sm font-bold text-slate-900">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-extrabold">
                <Sparkles className="w-3 h-3 text-amber-300" />
                ACRIO
              </span>
              {acrioData?.engineLabel && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    acrioData.source === "ai" || acrioData.source === "cache"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      acrioData.source === "ai" || acrioData.source === "cache"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                  />
                  {acrioData.engineLabel}
                </span>
              )}
              {results.length > 0 && (
                <span>
                  Found {results.length} matching{" "}
                  {onlyPodiums ? "podiums" : "products"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setResults(null);
                setSummary(null);
                setAcrioData(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Close
            </button>
          </div>

          {summary && (
            <div className="text-xs sm:text-sm text-slate-800 bg-gradient-to-r from-indigo-50/80 to-blue-50/60 border border-indigo-100 px-4 py-3 rounded-2xl space-y-2">
              <p className="leading-relaxed font-medium">{summary}</p>
              {isAdmin && acrioData?.aiDiagnostic && (
                <p className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-lg px-2.5 py-1.5">
                  <strong>Admin Note:</strong> {acrioData.aiDiagnostic}
                </p>
              )}
              {acrioData?.highlights && acrioData.highlights.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {acrioData.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-slate-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {results.map((prod) => (
                <Link
                  key={prod.id}
                  href={`/shop/p/${prod.slug}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-[#0056b3] hover:bg-blue-50/30 transition-all group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={prod.mainImage || "/short-logo.png"}
                    alt={prod.name}
                    className="w-16 h-16 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0056b3]">
                      {prod.subCategoryName || prod.categoryName}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0056b3] line-clamp-2 leading-snug">
                      {prod.name}
                    </h4>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800">
                        {prod.effectivePrice
                          ? `₹${prod.effectivePrice.toLocaleString("en-IN")}`
                          : "Price on Request"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0056b3]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {acrioData && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                {acrioData.followUpChips?.slice(0, 3).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void runAcrioSearch(chip)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 text-xs font-medium text-slate-700 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <a
                href={`https://wa.me/${(
                  acrioData.whatsappNumber || "+917337222876"
                ).replace(/\D/g, "")}?text=${encodeURIComponent(
                  acrioData.whatsappPrefill ||
                    `Hi Classic Concepts, I need help with: ${query}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1da851] hover:bg-[#158c42] text-white text-xs font-bold transition-colors shadow-2xs"
              >
                <WhatsAppIcon size={14} className="shrink-0" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
