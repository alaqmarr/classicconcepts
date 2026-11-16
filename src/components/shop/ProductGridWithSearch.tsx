"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  Check,
  RotateCcw,
  ChevronRight,
  Layers,
  Tag,
  IndianRupee,
} from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";

export type FilterSheetGroup = {
  title: string;
  items: {
    label: string;
    href: string;
    count?: number;
    active?: boolean;
  }[];
};

type PriceBracket =
  | "ALL"
  | "UNDER_1500"
  | "1500_TO_5000"
  | "5000_TO_15000"
  | "ABOVE_15000";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEffectivePrice(p: any): number {
  const val = Number(p?.discountPrice ?? p?.basePrice ?? p?.price ?? 0);
  return Number.isFinite(val) && val > 0 ? val : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLocalGroupLabel(p: any): string {
  if (typeof p?.podiumSubCategory === "string" && p.podiumSubCategory.trim()) {
    return p.podiumSubCategory.trim();
  }
  if (
    p?.podiumSubCategory &&
    typeof p.podiumSubCategory === "object" &&
    typeof p.podiumSubCategory.name === "string"
  ) {
    return p.podiumSubCategory.name.trim();
  }
  if (Array.isArray(p?.subCategories) && p.subCategories[0]?.name) {
    return String(p.subCategories[0].name).trim();
  }
  if (typeof p?.subCategoryName === "string" && p.subCategoryName.trim()) {
    return p.subCategoryName.trim();
  }
  if (typeof p?.category?.name === "string" && p.category.name.trim()) {
    return p.category.name.trim();
  }
  return "";
}

export function ProductGridWithSearch({
  products,
  phone = "+917337220568",
  initialQuery = "",
  contextLabel,
  categoryLabel,
  itemLabel = "products",
  clearHref,
  clearText = "View All",
  filterGroups = [],
  quickPills = [],
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[];
  phone?: string | null;
  initialQuery?: string;
  contextLabel?: string;
  categoryLabel?: string;
  itemLabel?: string;
  clearHref?: string;
  clearText?: string;
  filterGroups?: FilterSheetGroup[];
  quickPills?: {
    label: string;
    href: string;
    count?: number;
    active?: boolean;
  }[];
}) {
  const effectiveContextLabel = contextLabel || categoryLabel || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<
    "default" | "price-asc" | "price-desc" | "name-asc"
  >("default");
  const [priceFilter, setPriceFilter] = useState<"ALL" | "FIXED" | "POA">("ALL");
  const [priceBracket, setPriceBracket] = useState<PriceBracket>("ALL");
  const [selectedLocalGroup, setSelectedLocalGroup] = useState<string>("ALL");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Lock body scroll when filter sheet is open
  useEffect(() => {
    if (!isFilterSheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFilterSheetOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterSheetOpen]);

  // Derive in-page sub-group options
  const localGroupOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const label = getLocalGroupLabel(p);
      if (label) {
        counts.set(label, (counts.get(label) || 0) + 1);
      }
    }
    if (counts.size <= 1) return [];
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    let list = products.filter((p) => {
      const effPrice = getEffectivePrice(p);
      if (priceFilter === "FIXED" && effPrice <= 0) {
        return false;
      }
      if (priceFilter === "POA" && effPrice > 0) {
        return false;
      }
      if (priceBracket !== "ALL") {
        if (effPrice <= 0) return false;
        if (priceBracket === "UNDER_1500" && effPrice >= 1500) return false;
        if (
          priceBracket === "1500_TO_5000" &&
          (effPrice < 1500 || effPrice > 5000)
        )
          return false;
        if (
          priceBracket === "5000_TO_15000" &&
          (effPrice <= 5000 || effPrice > 15000)
        )
          return false;
        if (priceBracket === "ABOVE_15000" && effPrice <= 15000) return false;
      }
      if (selectedLocalGroup !== "ALL") {
        const groupLabel = getLocalGroupLabel(p);
        if (groupLabel !== selectedLocalGroup) return false;
      }
      if (tokens.length === 0) return true;

      const haystack = [
        p?.name || "",
        p?.sku || "",
        p?.category?.name || "",
        getLocalGroupLabel(p),
        p?.dimensions || "",
        p?.material || "",
        p?.description || "",
      ]
        .join(" ")
        .toLowerCase();

      return tokens.every((token) => haystack.includes(token));
    });

    if (sortBy === "price-asc") {
      list = [...list].sort((a, b) => {
        const aP =
          getEffectivePrice(a) > 0
            ? getEffectivePrice(a)
            : Number.MAX_SAFE_INTEGER;
        const bP =
          getEffectivePrice(b) > 0
            ? getEffectivePrice(b)
            : Number.MAX_SAFE_INTEGER;
        return aP - bP;
      });
    } else if (sortBy === "price-desc") {
      list = [...list].sort((a, b) => {
        const aP = getEffectivePrice(a) > 0 ? getEffectivePrice(a) : -1;
        const bP = getEffectivePrice(b) > 0 ? getEffectivePrice(b) : -1;
        return bP - aP;
      });
    } else if (sortBy === "name-asc") {
      list = [...list].sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""))
      );
    }

    return list;
  }, [
    products,
    searchQuery,
    sortBy,
    priceFilter,
    priceBracket,
    selectedLocalGroup,
  ]);

  const activeFilterCount =
    (priceFilter !== "ALL" ? 1 : 0) +
    (priceBracket !== "ALL" ? 1 : 0) +
    (selectedLocalGroup !== "ALL" ? 1 : 0) +
    (sortBy !== "default" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const resetAllFilters = () => {
    setSearchQuery("");
    setPriceFilter("ALL");
    setPriceBracket("ALL");
    setSelectedLocalGroup("ALL");
    setSortBy("default");
  };

  const priceBracketLabel: Record<PriceBracket, string> = {
    ALL: "Any Price",
    UNDER_1500: "Under ₹1,500",
    "1500_TO_5000": "₹1,500 – ₹5,000",
    "5000_TO_15000": "₹5,000 – ₹15,000",
    ABOVE_15000: "Above ₹15,000",
  };

  return (
    <div className="space-y-4 w-full">
      {/* Optional Quick Horizontal Category / Range Pills */}
      {quickPills.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {quickPills.map((pill) => (
            <Link
              key={pill.href + pill.label}
              href={pill.href}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 border ${
                pill.active
                  ? "bg-[#0c1a40] text-white border-[#0c1a40] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-[#0056b3] hover:text-[#0056b3]"
              }`}
            >
              <span>{pill.label}</span>
              {typeof pill.count === "number" && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    pill.active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {pill.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Unified Full-Width Filter, Search & Sort Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          {/* Left: Filter Sheet Button + Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0c1a40] hover:bg-[#0056b3] text-white text-xs sm:text-sm font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters &amp; Categories</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#e31837] text-white text-[11px] font-extrabold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Instant Keyword / SKU Filter Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Filter ${
                  effectiveContextLabel
                    ? effectiveContextLabel.toLowerCase()
                    : itemLabel
                } by name, SKU, size, or thickness...`}
                className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0056b3] text-slate-900 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Price Quick Toggle + Sort Selector */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            {/* Price Type Pills */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {(
                [
                  { id: "ALL", label: "All" },
                  { id: "FIXED", label: "Online Price" },
                  { id: "POA", label: "Custom Quote" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPriceFilter(tab.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    priceFilter === tab.id
                      ? "bg-white text-[#0056b3] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <label htmlFor="product-sort-select" className="sr-only">
                Sort products
              </label>
              <select
                id="product-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="default">Sort: Featured</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Bar & Active Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Showing{" "}
              <strong className="text-slate-900 font-extrabold">
                {filteredProducts.length}
              </strong>{" "}
              of <strong className="text-slate-700">{products.length}</strong>{" "}
              {itemLabel}
              {effectiveContextLabel ? ` in ${effectiveContextLabel}` : ""}
            </span>

            {/* Active Filter Chips */}
            {selectedLocalGroup !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedLocalGroup("ALL")}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0056b3] border border-blue-200 font-bold text-[11px]"
              >
                <span>{selectedLocalGroup}</span>
                <X className="w-3 h-3" />
              </button>
            )}
            {priceFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setPriceFilter("ALL")}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0056b3] border border-blue-200 font-bold text-[11px]"
              >
                <span>
                  {priceFilter === "FIXED" ? "Online Price" : "Custom Quote"}
                </span>
                <X className="w-3 h-3" />
              </button>
            )}
            {priceBracket !== "ALL" && (
              <button
                type="button"
                onClick={() => setPriceBracket("ALL")}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0056b3] border border-blue-200 font-bold text-[11px]"
              >
                <span>{priceBracketLabel[priceBracket]}</span>
                <X className="w-3 h-3" />
              </button>
            )}
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0056b3] border border-blue-200 font-bold text-[11px]"
              >
                <span>&ldquo;{searchQuery.trim()}&rdquo;</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs font-bold text-[#0056b3] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset all filters
              </button>
            )}
            {clearHref && clearText && (
              <Link
                href={clearHref}
                className="text-xs font-bold text-slate-600 hover:text-[#0056b3] transition-colors"
              >
                {clearText} →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Width Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
          <p className="text-base sm:text-lg font-bold text-slate-800 mb-1">
            No matching {itemLabel} found
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mb-5 max-w-md mx-auto">
            Try clearing one of your active filters, or ask ACRIO to recommend the
            closest ready or custom-fabricated acrylic item.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
            {clearHref && clearText && (
              <Link
                href={clearHref}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors"
              >
                {clearText}
              </Link>
            )}
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("cc:open-concierge", {
                    detail: { query: searchQuery.trim(), autoAsk: true },
                  })
                )
              }
              className="inline-flex items-center gap-1.5 bg-[#0056b3] hover:bg-[#004494] text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Ask ACRIO for Match
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} phone={phone} />
          ))}
        </div>
      )}

      {/* Slide-Over Filter Sheet (Drawer) */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-xs flex justify-start animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFilterSheetOpen(false);
          }}
        >
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-r border-slate-200 animate-in slide-in-from-left duration-200">
            {/* Sheet Header */}
            <div className="px-5 py-4 bg-[#0c1a40] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0056b3] flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold tracking-tight">
                    Filters &amp; Categories
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Showing {filteredProducts.length} of {products.length}{" "}
                    {itemLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* 1. In-Page Sub-Category / Type Filter (when multiple groups exist in current product set) */}
              {localGroupOptions.length > 0 && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#0056b3]" /> Filter Current
                    View
                  </h3>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setSelectedLocalGroup("ALL")}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        selectedLocalGroup === "ALL"
                          ? "bg-[#0056b3] text-white"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span>
                        All in {effectiveContextLabel || "Current Page"}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                          selectedLocalGroup === "ALL"
                            ? "bg-white/20 text-white"
                            : "bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        {products.length}
                      </span>
                    </button>
                    {localGroupOptions.map((opt) => {
                      const active = selectedLocalGroup === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() =>
                            setSelectedLocalGroup(active ? "ALL" : opt.label)
                          }
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? "bg-[#0056b3] text-white font-bold"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span className="truncate pr-2 text-left">
                            {opt.label}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {opt.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Price Type & Price Range Filter */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-[#0056b3]" /> Pricing
                  &amp; Budget
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(
                    [
                      { id: "ALL", label: "All Items" },
                      { id: "FIXED", label: "Online Price" },
                      { id: "POA", label: "Custom Quote" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPriceFilter(item.id)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        priceFilter === item.id
                          ? "bg-[#0056b3] text-white border-[#0056b3]"
                          : "bg-white text-slate-700 border-slate-200 hover:border-[#0056b3]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "ALL", label: "Any Budget" },
                      { id: "UNDER_1500", label: "Under ₹1,500" },
                      { id: "1500_TO_5000", label: "₹1,500 – ₹5,000" },
                      { id: "5000_TO_15000", label: "₹5,000 – ₹15,000" },
                      { id: "ABOVE_15000", label: "Above ₹15,000" },
                    ] as const
                  ).map((bracket) => (
                    <button
                      key={bracket.id}
                      type="button"
                      onClick={() => {
                        setPriceBracket(bracket.id);
                        if (bracket.id !== "ALL") setPriceFilter("FIXED");
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        priceBracket === bracket.id
                          ? "bg-blue-50 text-[#0056b3] border-[#0056b3] font-bold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{bracket.label}</span>
                      {priceBracket === bracket.id && (
                        <Check className="w-3.5 h-3.5 text-[#0056b3] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Sort Order */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#0056b3]" /> Sort
                  Products By
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "default", label: "Featured" },
                      { id: "name-asc", label: "Name: A to Z" },
                      { id: "price-asc", label: "Price: Low to High" },
                      { id: "price-desc", label: "Price: High to Low" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSortBy(opt.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        sortBy === opt.id
                          ? "bg-blue-50 text-[#0056b3] border-[#0056b3] font-bold"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && (
                        <Check className="w-3.5 h-3.5 text-[#0056b3] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Navigation Groups (Categories / Sub-Categories / Problems / Industries) */}
              {filterGroups.map((group) => (
                <div key={group.title} className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0056b3]" />{" "}
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        onClick={() => setIsFilterSheetOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                          item.active
                            ? "bg-[#0c1a40] text-white font-bold"
                            : "text-slate-700 hover:bg-slate-100 font-semibold"
                        }`}
                      >
                        <span className="truncate pr-2">{item.label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {typeof item.count === "number" && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                item.active
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                          <ChevronRight
                            className={`w-3.5 h-3.5 ${
                              item.active ? "text-white" : "text-slate-400"
                            }`}
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Sheet Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 bg-[#0056b3] hover:bg-[#004494] text-white font-bold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
              >
                Show {filteredProducts.length} Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
