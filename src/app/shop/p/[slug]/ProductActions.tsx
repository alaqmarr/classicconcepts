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
      {/* Normal inline buttons in the product flow */}
      <div className="mt-auto pt-6 pb-2 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
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

      {/* Fixed bottom bar for ALL screen sizes (Mobile + Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white border-t border-slate-200 z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-safe">
        <div className="max-w-7xl mx-auto flex gap-3 sm:gap-6 justify-center sm:justify-end items-center">
          
          {/* Desktop Product Summary on left side of the fixed bar */}
          <div className="hidden sm:flex flex-1 items-center gap-4">
            <span className="font-bold text-slate-800 line-clamp-1 text-lg">{product.name}</span>
            {product.price && <span className="font-semibold text-blue-600 text-lg">₹{product.price}</span>}
          </div>

          <button 
            onClick={handleAddToCart}
            className="flex-1 sm:flex-none bg-slate-900 text-white py-3.5 px-4 sm:px-10 rounded-xl font-bold text-sm sm:text-base hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <ShoppingCart size={20} /> <span className="hidden sm:inline">Add to Cart</span><span className="sm:hidden">Cart</span>
          </button>
          <button 
            onClick={handleEnquire}
            className="flex-1 sm:flex-none bg-[#25D366] text-white py-3.5 px-4 sm:px-10 rounded-xl font-bold text-sm sm:text-base hover:bg-[#128C7E] transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <FaWhatsapp size={20} /> <span className="hidden sm:inline">Enquire on WhatsApp</span><span className="sm:hidden">Enquire</span>
          </button>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind the fixed bar */}
      <div className="h-24"></div>
    </>
  );
}
