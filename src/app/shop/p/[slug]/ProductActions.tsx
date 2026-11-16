"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, Sparkles } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { openGlobalSearchModal } from "@/components/ai/GlobalSearchModal";

interface ProductActionsProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number | null;
    image: string;
  };
  phone: string;
}

export function ProductActions({
  product,
  phone = "+917337222876",
}: ProductActionsProps) {
  const { addToCart } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEnquire = () => {
    const rawPhone = phone || "+917337222876";
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("91") && cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    const text = encodeURIComponent(
      `Hi, I would like to enquire about the product: ${product.name} (SKU/Link: ${window.location.origin}/shop/p/${product.slug})`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const handleAddToCart = () => {
    addToCart(product);
  };

  const stickyBottomBar = (
    <div className="fixed bottom-0 left-0 right-0 z-[75] bg-white border-t border-slate-200 shadow-[0_-10px_30px_rgba(15,23,42,0.14)] px-3 py-2.5 sm:px-6 sm:py-3.5 pb-safe">
      <div className="container mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: ACRIO Product Assistant Trigger + Product Summary */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => openGlobalSearchModal(product.name)}
            className="group flex items-center gap-2 bg-[#0c1a40] hover:bg-[#0056b3] text-white pl-2.5 pr-3.5 py-2 sm:py-2.5 rounded-full shadow-md border border-slate-800 transition-all shrink-0"
            aria-label="Ask ACRIO or search acrylic products"
          >
            <span className="w-7 h-7 rounded-full bg-[#0056b3] group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </span>
            <div className="text-left leading-tight">
              <span className="hidden md:block text-[9px] font-bold uppercase tracking-wider text-sky-300">
                ACRIO Product Assistant
              </span>
              <span className="block text-xs font-bold text-white whitespace-nowrap">
                <span className="md:hidden">Ask ACRIO</span>
                <span className="hidden md:inline">Search &amp; Find Products</span>
              </span>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200 min-w-0">
            <span className="font-bold text-slate-900 truncate text-base lg:text-lg">
              {product.name}
            </span>
            {product.price ? (
              <span className="font-extrabold text-[#0056b3] text-base lg:text-lg shrink-0">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
            ) : null}
          </div>
        </div>

        {/* Right: Add to Cart & Enquire on WhatsApp */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 md:flex-none justify-end">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 md:flex-none bg-slate-900 text-white py-2.5 sm:py-3 px-3.5 sm:px-7 rounded-xl font-bold text-xs sm:text-sm lg:text-base hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <ShoppingCart size={18} className="shrink-0" />
            <span className="hidden sm:inline">Add to Cart</span>
            <span className="sm:hidden">Cart</span>
          </button>
          <button
            type="button"
            onClick={handleEnquire}
            className="flex-1 md:flex-none bg-[#25D366] text-white py-2.5 sm:py-3 px-3.5 sm:px-7 rounded-xl font-bold text-xs sm:text-sm lg:text-base hover:bg-[#128C7E] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <FaWhatsapp size={19} className="shrink-0" />
            <span className="hidden sm:inline">Enquire on WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Normal inline buttons in the product flow */}
      <div className="mt-auto pt-6 pb-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3.5 sm:gap-4">
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex-1 bg-slate-900 text-white py-3.5 sm:py-4 px-6 sm:px-8 rounded-xl font-bold text-base sm:text-lg hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
        >
          <ShoppingCart size={20} /> Add to Cart
        </button>
        <button
          type="button"
          onClick={handleEnquire}
          className="flex-1 bg-[#25D366] text-white py-3.5 sm:py-4 px-6 sm:px-8 rounded-xl font-bold text-base sm:text-lg hover:bg-[#128C7E] transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
        >
          <FaWhatsapp size={21} /> Enquire on WhatsApp
        </button>
      </div>

      {/* Render sticky bottom bar via portal at document.body so it never gets trapped behind page sections or footer */}
      {mounted ? createPortal(stickyBottomBar, document.body) : null}
    </>
  );
}
