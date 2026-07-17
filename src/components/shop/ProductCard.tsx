"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useCart } from "@/context/CartContext";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number | null;
    discountPrice: number | null;
    discountBadge: string | null;
    stockStatus: string;
    images: { url: string; isMain: boolean }[];
    category?: { name: string; slug: string };
  };
  phone?: string | null;
}

export function ProductCard({ product, phone = "+919876543210" }: ProductCardProps) {
  const { addToCart } = useCart();
  const mainImage = product.images.find(img => img.isMain)?.url || product.images[0]?.url || "/placeholder-image.jpg";
  
  const currentPrice = product.discountPrice || product.basePrice;

  const handleEnquire = (e: React.MouseEvent) => {
    e.preventDefault();
    const cleanPhone = phone ? phone.replace(/[^\d+]/g, "") : "";
    const text = encodeURIComponent(`Hi, I would like to enquire about the product: ${product.name} (SKU/Link: ${window.location.origin}/shop/p/${product.slug})`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: currentPrice,
      image: mainImage
    });
  };

  return (
    <Link href={`/shop/p/${product.slug}`} className="group block h-full">
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-1 h-full flex flex-col">
        
        {/* Image Container */}
        <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
          {product.discountBadge && (
            <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
              {product.discountBadge}
            </div>
          )}
          
          <Image 
            src={mainImage} 
            alt={product.name} 
            fill 
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Quick view overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
             <div className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2">
               View Details <ArrowRight size={16} />
             </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-5 flex-1 flex flex-col">
          {product.category && (
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {product.category.name}
            </p>
          )}
          <h3 className="font-bold text-slate-800 text-lg leading-tight mb-3 group-hover:text-[#0056b3] transition-colors line-clamp-2">
            {product.name}
          </h3>
          
          <div className="mt-auto">
            <div className="flex items-center gap-3 mb-3">
              {product.discountPrice ? (
                <>
                  <span className="text-xl font-extrabold text-[#0056b3]">₹{product.discountPrice.toLocaleString()}</span>
                  <span className="text-sm font-medium text-slate-400 line-through">₹{product.basePrice?.toLocaleString()}</span>
                </>
              ) : product.basePrice ? (
                <span className="text-xl font-extrabold text-slate-800">₹{product.basePrice.toLocaleString()}</span>
              ) : (
                <span className="text-sm font-bold text-slate-500">Price on Request</span>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mb-4">
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                product.stockStatus === 'In stock' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
              }`}>
                {product.stockStatus}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-auto">
              <button 
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <ShoppingCart size={16} /> Add
              </button>
              <button 
                onClick={handleEnquire}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#25D366] text-white text-sm font-bold rounded-lg hover:bg-[#128C7E] transition-colors"
              >
                <FaWhatsapp size={16} /> Enquire
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
