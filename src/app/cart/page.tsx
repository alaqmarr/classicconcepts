"use client";

import { useCart } from "@/context/CartContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Trash2, ShoppingCart, ArrowRight, Minus, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message"),
      cartItems
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success("Checkout request sent successfully! We will contact you soon.");
        clearCart();
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error("Failed to send request. Please try again or contact us directly.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fff0f0] via-[#fffbf0] to-[#f0f4ff] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Cart" }
        ]}
        title={
          <>
            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Cart</span>
          </>
        }
      />

      <section className="py-12 container mx-auto px-6 relative z-20">
        {cartItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 shadow-sm border border-slate-200 text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
              <ShoppingCart size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Your cart is empty</h2>
            <p className="text-slate-500 mb-8">Looks like you haven't added any products to your cart yet.</p>
            <Link href="/shop" className="inline-flex items-center gap-2 bg-[#0056b3] text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-lg hover:shadow-xl">
              Continue Shopping <ArrowRight size={20} />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Cart Items List */}
            <div className="flex-1 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 md:p-8 space-y-8">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                      
                      <div className="flex-1 text-center sm:text-left">
                        <Link href={`/shop/p/${item.slug}`} className="text-lg font-bold text-slate-900 hover:text-[#0056b3] transition-colors line-clamp-1 mb-1">
                          {item.name}
                        </Link>
                        {item.price ? (
                          <div className="text-[#0056b3] font-bold">₹{item.price.toLocaleString()}</div>
                        ) : (
                          <div className="text-slate-500 font-semibold text-sm">Price on Request</div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 text-slate-500 hover:text-slate-900 transition-colors">
                            <Minus size={16} />
                          </button>
                          <span className="w-10 text-center font-bold text-sm text-slate-900">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 text-slate-500 hover:text-slate-900 transition-colors">
                            <Plus size={16} />
                          </button>
                        </div>
                        
                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Checkout Form */}
            <div className="w-full lg:w-[400px]">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sticky top-24">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Request Checkout</h3>
                
                <div className="flex justify-between items-center pb-6 border-b border-slate-100 mb-6">
                  <span className="text-slate-500 font-medium">Estimated Total</span>
                  <span className="text-2xl font-extrabold text-[#0056b3]">₹{cartTotal.toLocaleString()}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name *</label>
                    <input type="text" name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] transition-all" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email Address *</label>
                    <input type="email" name="email" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] transition-all" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input type="tel" name="phone" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] transition-all" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Additional Message (Optional)</label>
                    <textarea name="message" rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] transition-all" placeholder="Any specific requirements?"></textarea>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full mt-4 bg-[#0056b3] text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-colors shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? "Sending Request..." : "Submit Request"}
                  </button>
                  <p className="text-xs text-slate-400 text-center mt-4">
                    By submitting, you agree to our terms. We will contact you to finalize the order.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
