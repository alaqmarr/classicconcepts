"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { ProductGallery } from "./ProductGallery";
import { ProductActions } from "./ProductActions";

interface Variant {
  id: string;
  name: string;
  price?: number | null;
  imageUrl?: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  basePrice?: number | null;
  discountPrice?: number | null;
  discountBadge?: string | null;
  stockStatus: string;
  description?: string | null;
  category: {
    name: string;
    slug: string;
  };
  images: { url: string; isMain: boolean }[];
  variants: Variant[];
}

interface InteractiveProductViewProps {
  product: Product;
  phone: string;
}

export function InteractiveProductView({ product, phone }: InteractiveProductViewProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // Determine current display values based on selected variant
  const currentPrice = selectedVariant?.price || product.discountPrice || product.basePrice;
  const originalPrice = selectedVariant ? null : product.basePrice;
  const currentName = selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name;
  
  // Use the variant image if available, otherwise use the main product image
  const defaultImage = product.images.find(i => i.isMain)?.url || product.images[0]?.url || "/placeholder-image.jpg";
  const currentImage = selectedVariant?.imageUrl || defaultImage;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
      {/* Left Column: Image Gallery */}
      <div className="p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50">
        <ProductGallery 
          images={product.images.map(img => img.url)} 
          productName={product.name} 
          discountBadge={product.discountBadge} 
          selectedImageUrl={selectedVariant?.imageUrl}
        />
      </div>

      {/* Right Column: Product Details */}
      <div className="p-8 lg:p-12 flex flex-col">
        <div className="mb-6">
          <Link href={`/shop/c/${product.category.slug}`} className="inline-block px-3 py-1 bg-blue-50 text-[#0056b3] text-xs font-bold rounded-full uppercase tracking-wider mb-4 hover:bg-[#0056b3] hover:text-white transition-colors">
            {product.category.name}
          </Link>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-2">
            {currentName}
          </h1>
          {product.sku && (
            <p className="text-sm font-medium text-slate-500">
              SKU: {product.sku}
            </p>
          )}
        </div>

        <div className="flex items-end gap-4 mb-8">
          {currentPrice ? (
            <>
              <span className="text-4xl font-extrabold text-[#0056b3]">₹{currentPrice.toLocaleString()}</span>
              {originalPrice && product.discountPrice && (
                <span className="text-lg font-medium text-slate-400 line-through mb-1">₹{originalPrice.toLocaleString()}</span>
              )}
            </>
          ) : (
            <span className="text-2xl font-bold text-slate-500">Price on Request</span>
          )}
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
            product.stockStatus === 'In stock' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
          }`}>
            <Package size={18} />
            {product.stockStatus}
          </div>
        </div>

        {product.description && (
          <div className="prose prose-slate mb-10">
            <p className="text-slate-600 leading-relaxed text-lg">
              {product.description}
            </p>
          </div>
        )}

        {/* Variants */}
        {product.variants.length > 0 && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              Select Variant 
              {selectedVariant && (
                <button 
                  onClick={() => setSelectedVariant(null)} 
                  className="text-xs font-normal text-blue-500 hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </h3>
            <div className="flex flex-wrap gap-4">
              {product.variants.map(variant => {
                const isSelected = selectedVariant?.id === variant.id;
                return (
                  <button 
                    key={variant.id} 
                    onClick={() => setSelectedVariant(variant)}
                    className={`group relative flex flex-col items-center border-2 rounded-2xl p-2 sm:p-3 transition-all w-24 sm:w-28 text-center ${
                      isSelected 
                        ? 'border-[#0056b3] bg-blue-50/30 shadow-md ring-2 ring-[#0056b3]/20' 
                        : 'border-slate-200 hover:border-[#0056b3]/60 hover:shadow-md bg-white'
                    }`}
                  >
                    {variant.imageUrl ? (
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-white border border-slate-100 shadow-sm">
                        <Image 
                          src={variant.imageUrl} 
                          alt={variant.name} 
                          fill 
                          sizes="100px"
                          className="object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm group-hover:text-slate-400 transition-colors">
                        <Package size={28} />
                      </div>
                    )}
                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-[#0056b3]' : 'text-slate-700 group-hover:text-slate-900'}`}>
                      {variant.name}
                    </span>
                    {variant.price ? (
                      <span className={`text-[11px] mt-1 font-medium ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                        +₹{variant.price}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Call to action */}
        <ProductActions 
          product={{
            id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
            name: currentName,
            slug: product.slug,
            price: currentPrice || null,
            image: currentImage
          }}
          phone={phone}
        />
      </div>
    </div>
  );
}
