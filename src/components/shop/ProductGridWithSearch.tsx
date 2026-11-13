"use client";

import { useState } from "react";
import { Search, Sparkles, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import type { ConciergeProductCard } from "@/lib/ai";

interface ProductGridWithSearchProps {
  products: any[];
  phone?: string | null;
  contextLabel: string;
  itemLabel?: string;
  clearHref: string;
  clearText?: string;
}

export function ProductGridWithSearch({
  products,
  phone,
  contextLabel,
  itemLabel = "products",
  clearHref,
  clearText = "View All",
}: ProductGridWithSearchProps) {
  const [query, setQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiCrossCatalog, setAiCrossCatalog] = useState<
    ConciergeProductCard[] | null
  >(null);

  const normalizedQuery = query.trim().toLowerCase();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const filtered = tokens.length
    ? products.filter((p) => {
        const hay = `${p.name || ""} ${p.sku || ""} ${p.description || ""} ${
          p.category?.name || ""
        }`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
    : products;

  const runAiSearch = async () => {
    const clean = query.trim();
    if (!clean) return;
    setAiLoading(true);
    try {
      const res = await fetch(
        `/api/ai/search?q=${encodeURIComponent(clean)}&ai=1&limit=8`
      );
      const data = await res.json();
      setAiSummary(data.summary || null);
      setAiCrossCatalog(Array.isArray(data.products) ? data.products : []);
    } catch {
      // Non-blocking fallback
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar (Instant Filter + AI Smart Search) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-600 text-sm font-medium">
          Showing{" "}
          <span className="font-bold text-slate-900">{filtered.length}</span>{" "}
          {itemLabel} in{" "}
          <span className="font-bold text-[#0056b3]">{contextLabel}</span>{" "}
          (Sorted A–Z)
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runAiSearch();
          }}
          className="flex items-center gap-2 w-full md:w-auto"
        >
          <div className="relative flex-1 md:w-80">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setAiSummary(null);
                  setAiCrossCatalog(null);
                }
              }}
              placeholder={`Search or talk to ACRIO in ${contextLabel}...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Search size={17} />
            </span>
          </div>

          {query.trim().length > 1 && (
            <button
              type="submit"
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 shadow-2xs transition-colors cursor-pointer"
              title="Talk to ACRIO across the Classic Concepts catalog"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Talk to ACRIO</span>
            </button>
          )}
        </form>
      </div>

      {/* ACRIO Match Banner when triggered */}
      {(aiSummary || (aiCrossCatalog && aiCrossCatalog.length > 0)) && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/80 border border-indigo-200 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold shrink-0 mt-0.5">
                <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                ACRIO
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-800">
                {aiSummary ||
                  `ACRIO picked these matching products across our catalog for "${query}":`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAiSummary(null);
                setAiCrossCatalog(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 shrink-0"
            >
              Dismiss
            </button>
          </div>

          {aiCrossCatalog && aiCrossCatalog.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {aiCrossCatalog.slice(0, 4).map((prod) => (
                <Link
                  key={prod.id}
                  href={`/shop/p/${prod.slug}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#0056b3] transition-all group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={prod.mainImage || "/short-logo.png"}
                    alt={prod.name}
                    className="w-12 h-12 rounded-lg object-contain bg-slate-50 p-1 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0056b3] line-clamp-2">
                      {prod.name}
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                      {prod.effectivePrice
                        ? `₹${prod.effectivePrice.toLocaleString("en-IN")}`
                        : "Enquire"}
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Grid - 2 columns side-by-side on mobile */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} phone={phone} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            No exact {itemLabel} in {contextLabel}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Talk to ACRIO to find matching items across all Classic Concepts categories.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {query ? (
              <>
                <button
                  type="button"
                  onClick={() => void runAiSearch()}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Talk to ACRIO Across All Products</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              </>
            ) : (
              <Link
                href={clearHref}
                className="inline-block bg-[#0056b3] text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-800 transition-colors"
              >
                {clearText}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
