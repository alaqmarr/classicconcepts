"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";

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

  const filtered = query.trim()
    ? products.filter(
        (p) =>
          p.name?.toLowerCase().includes(query.trim().toLowerCase()) ||
          p.sku?.toLowerCase().includes(query.trim().toLowerCase()) ||
          p.description?.toLowerCase().includes(query.trim().toLowerCase())
      )
    : products;

  return (
    <div className="space-y-6">
      {/* Top Bar (Search) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-slate-600 text-sm font-medium">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> {itemLabel} in{" "}
          <span className="font-bold text-[#0056b3]">{contextLabel}</span> (Sorted A–Z)
        </p>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search in ${contextLabel}...`}
            className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search size={18} />
          </span>
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} phone={phone} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No {itemLabel} found</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            We couldn&apos;t find any {itemLabel} in {contextLabel} matching your criteria.
          </p>
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-block mt-6 bg-[#0056b3] text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-800 transition-colors"
            >
              Clear Search
            </button>
          ) : (
            <Link
              href={clearHref}
              className="inline-block mt-6 bg-[#0056b3] text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-800 transition-colors"
            >
              {clearText}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
