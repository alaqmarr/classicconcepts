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
    <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4">
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
  );
}
