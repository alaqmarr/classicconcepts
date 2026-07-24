"use client";

import { useCart } from "@/context/CartContext";
import { ShoppingCart } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

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

export function ProductActions({ product, phone }: ProductActionsProps) {
  const { addToCart } = useCart();

  const handleEnquire = () => {
    const cleanPhone = phone ? phone.replace(/[^\d+]/g, "") : "";
    const text = encodeURIComponent(`Hi, I would like to enquire about the product: ${product.name} (SKU/Link: ${window.location.origin}/shop/p/${product.slug})`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const handleAddToCart = () => {
    addToCart(product);
  };

  return (
    <>
      {/* Desktop: Sticky at bottom of the right column container */}
      <div className="hidden sm:flex mt-auto pt-6 pb-2 sticky bottom-0 z-30 bg-white border-t border-slate-100 flex-row gap-4">
        <button 
          onClick={handleAddToCart}
          className="flex-1 bg-slate-900 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
        >
          <ShoppingCart size={22} /> Add to Cart
        </button>
        <button 
          onClick={handleEnquire}
          className="flex-1 bg-[#25D366] text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-[#128C7E] transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-3"
        >
          <FaWhatsapp size={22} /> Enquire on WhatsApp
        </button>
      </div>

      {/* Mobile: Fixed bottom bar to viewport */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 z-[100] flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-safe">
        <button 
          onClick={handleAddToCart}
          className="flex-1 bg-slate-900 text-white py-3.5 px-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <ShoppingCart size={18} /> Add to Cart
        </button>
        <button 
          onClick={handleEnquire}
          className="flex-1 bg-[#25D366] text-white py-3.5 px-2 rounded-xl font-bold text-sm hover:bg-[#128C7E] transition-colors shadow-md flex items-center justify-center gap-2"
        >
          <FaWhatsapp size={18} /> Enquire
        </button>
      </div>

      {/* Spacer to prevent mobile content from being hidden behind the fixed bar */}
      <div className="h-20 sm:hidden"></div>
    </>
  );
}
