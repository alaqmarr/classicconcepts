"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Search,
  ArrowRight,
  Loader2,
  CheckCircle2,
  MessageCircle,
  MapPin,
  ExternalLink,
  Package,
  X,
} from "lucide-react";
import { EditableText } from "@/components/inline-edit/EditableText";
import { useInlineEdit } from "@/components/inline-edit/InlineEditProvider";

function buildWhatsAppHref(_rawNumber: string, text: string) {
  const digits = "917337220568";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

type RecommendedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  priceType: string;
  categoryName: string;
  imageUrl: string | null;
  reason?: string;
};

type ConciergeResponse = {
  message: string;
  highlights: string[];
  suggestedLinks: { label: string; href: string }[];
  whatsappPrefill: string;
  products: RecommendedProduct[];
};

const SHOP_QUICK_IDEAS = [
  "Clear podium for stage",
  "Gifts for students under ₹1,000",
  "Brochure & menu stand for counter",
  "Suggestion box with lock",
  "Custom size acrylic display cover",
];

const PODIUM_QUICK_IDEAS = [
  "Clear stage podium with school logo",
  "Economy podium for classroom",
  "Wood & acrylic lectern for auditorium",
  "Heavy duty LED podium for hotel",
  "Motorized height adjustable podium",
];

export function ShopSmartSearchBar({
  whatsappNumber = "917337220568",
  defaultCategoryHint,
  onlyPodiums = false,
  placeholder,
  customQuickIdeas,
  contentPrefix = onlyPodiums ? "podiums.search" : "shop.search",
}: {
  whatsappNumber?: string;
  defaultCategoryHint?: string;
  onlyPodiums?: boolean;
  placeholder?: string;
  customQuickIdeas?: string[];
  contentPrefix?: string;
  isAdmin?: boolean;
}) {
  const { editMode } = useInlineEdit();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [acrioData, setAcrioData] = useState<ConciergeResponse | null>(null);
  const inFlightQueryRef = useRef<string>("");

  const effectiveHint =
    defaultCategoryHint || (onlyPodiums ? "Acrylic Podiums" : undefined);
  const quickIdeas =
    customQuickIdeas && customQuickIdeas.length > 0
      ? customQuickIdeas
      : onlyPodiums
        ? PODIUM_QUICK_IDEAS
        : SHOP_QUICK_IDEAS;

  const handleAsk = async (promptText?: string) => {
    const q = (promptText ?? query).trim();
    if (q.length < 2 || loading || inFlightQueryRef.current === q) return;
    inFlightQueryRef.current = q;
    if (promptText) setQuery(q);

    setLoading(true);
    try {
      const fullQuery =
        effectiveHint && !q.toLowerCase().includes(effectiveHint.toLowerCase())
          ? `${q} (${effectiveHint})`
          : q;

      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: fullQuery }),
      });
      const data = await res.json();
      if (res.ok && data) {
        setAcrioData({
          message: data.message || "",
          highlights: Array.isArray(data.highlights) ? data.highlights : [],
          suggestedLinks: Array.isArray(data.suggestedLinks)
            ? data.suggestedLinks
            : [],
          whatsappPrefill:
            data.whatsappPrefill ||
            `Hi Classic Concepts! I am looking for: ${q}. Please share options and prices.`,
          products: Array.isArray(data.products) ? data.products : [],
        });
      }
    } catch {
      // Fallback handled silently
    } finally {
      inFlightQueryRef.current = "";
      setLoading(false);
    }
  };

  return (
    <div className="w-full mb-4">
      {/* Full-Width Search & Product Finder Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="bg-white p-1.5 sm:p-2 rounded-xl shadow-xs border border-slate-200 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#0056b3] transition-all"
      >
        <div className="pl-2.5 sm:pl-3 flex items-center gap-2 text-[#0056b3] shrink-0">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            placeholder ||
            "Search by product name, SKU, size, or describe what you need (e.g. 'stage podium with logo', 'gift under ₹1,000')..."
          }
          className="flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm md:text-base font-medium focus:outline-none py-2 px-1"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setAcrioData(null);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="bg-[#0056b3] hover:bg-[#004494] disabled:opacity-60 text-white font-bold px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Find Products</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Prompt Chips (Editable in Inline Edit mode) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5">
        <EditableText
          contentKey={`${contentPrefix}.quick_label`}
          value="Quick Search:"
          label="Quick Search Label"
          className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1"
        />
        {quickIdeas.map((idea, idx) =>
          editMode ? (
            <span
              key={idx}
              className="text-[11px] sm:text-xs font-semibold bg-white text-slate-700 border border-slate-200 px-3 py-1 rounded-full"
            >
              <EditableText
                contentKey={`${contentPrefix}.chip_${idx + 1}`}
                value={idea}
                label={`Quick Search Chip #${idx + 1}`}
              />
            </span>
          ) : (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(idea)}
              className="text-[11px] sm:text-xs font-semibold bg-white hover:bg-[#0056b3] text-slate-700 hover:text-white border border-slate-200 hover:border-[#0056b3] px-3 py-1 rounded-full transition-colors cursor-pointer"
            >
              {idea}
            </button>
          )
        )}
      </div>

      {/* Inline Recommendations Card */}
      {(loading || acrioData) && (
        <div className="mt-4 bg-white text-slate-900 rounded-xl shadow-md border border-slate-200 p-4 sm:p-5 text-left animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0056b3] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" /> ACRIO Catalog
                Recommendations
              </span>
            </div>
            <div className="flex items-center gap-2">
              {acrioData?.whatsappPrefill && (
                <a
                  href={buildWhatsAppHref(
                    whatsappNumber,
                    acrioData.whatsappPrefill
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#25D366] hover:bg-[#1ebe57] text-white px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Get Quote on
                  WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => setAcrioData(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close recommendations"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading && !acrioData ? (
            <div className="flex items-center gap-2.5 py-4 text-sm font-medium text-slate-600">
              <Loader2 className="w-5 h-5 text-[#0056b3] animate-spin" />
              Finding the best products from our catalog...
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
                {acrioData?.message}
              </p>

              {acrioData?.highlights && acrioData.highlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {acrioData.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {acrioData?.products && acrioData.products.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {acrioData.products.slice(0, 4).map((product) => (
                    <Link
                      key={product.id}
                      href={`/shop/p/${product.slug}`}
                      className="flex flex-col justify-between p-3 rounded-xl border border-slate-200 hover:border-[#0056b3] hover:bg-blue-50/30 transition-all group bg-white"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
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
                            <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0056b3] line-clamp-2 leading-snug">
                              {product.name}
                            </p>
                            <p className="text-xs font-extrabold text-[#0056b3] mt-1">
                              {product.priceType === "FIXED" &&
                              product.price > 0
                                ? `₹${product.price.toLocaleString("en-IN")}`
                                : "Custom Quote / POA"}
                            </p>
                          </div>
                        </div>
                        {product.reason && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 mt-2.5 leading-snug">
                            {product.reason}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-[#0056b3] mt-2 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        View Specs &amp; Price{" "}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {acrioData?.suggestedLinks && acrioData.suggestedLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {acrioData.suggestedLinks.map((link, idx) => {
                    const isExternal = /^https?:\/\//i.test(link.href);
                    const isMapLink = /maps\.google\.com|google\.com\/maps|maps\.app\.goo\.gl/i.test(link.href);
                    if (isExternal) {
                      return (
                        <a
                          key={idx}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg transition-colors border ${
                            isMapLink
                              ? "text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                              : "text-[#0056b3] bg-white hover:bg-blue-50 border-blue-200"
                          }`}
                        >
                          {isMapLink ? <MapPin className="w-3.5 h-3.5 text-emerald-700" /> : null}
                          <span>{link.label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={idx}
                        href={link.href}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0056b3] bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg transition-colors"
                      >
                        {link.label} <ArrowRight className="w-3 h-3" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
