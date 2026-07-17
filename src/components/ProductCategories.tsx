"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function ProductCategories() {
  const categories = [
    { title: "Acrylic Furniture", bg: "bg-blue-100" },
    { title: "F&B Products", bg: "bg-amber-100" },
    { title: "Brochure Holder", bg: "bg-rose-100" },
    { title: "Display Units", bg: "bg-emerald-100" },
    { title: "Innovative Products", bg: "bg-indigo-100" },
    { title: "Industrial Products", bg: "bg-slate-200" },
    { title: "Utility Items", bg: "bg-orange-100" },
    { title: "Signage", bg: "bg-cyan-100" },
  ];

  return (
    <section className="w-full bg-brand-gray py-20 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">Our Product Range</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our extensive collection of premium acrylic products, engineered for durability and designed for elegance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/shop?category=${encodeURIComponent(cat.title)}`}>
                <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-64 cursor-pointer">
                  {/* Image Placeholder area */}
                  <div className={`w-full h-48 ${cat.bg} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                    {/* Abstract shape representing product */}
                    <div className="w-24 h-24 bg-white/40 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  
                  {/* Card Footer */}
                  <div className="flex-1 flex items-center justify-between px-6 py-4 bg-white z-10 border-t border-gray-50">
                    <h3 className="font-bold text-brand-blue group-hover:text-brand-dark transition-colors">{cat.title}</h3>
                    <ArrowRight size={18} className="text-brand-blue opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-12">
          <Link 
            href="/shop"
            className="inline-flex items-center gap-2 bg-brand-dark text-white font-semibold px-8 py-4 rounded-full hover:bg-black transition-colors shadow-lg hover:shadow-xl"
          >
            View All Products
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}
