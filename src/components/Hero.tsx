"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  const pills = [
    "Acrylic Podiums",
    "Acrylic Interiors",
    "Acrylic Lighting",
    "Acrylic Furniture",
  ];

  return (
    <section className="w-full bg-white relative overflow-hidden flex items-center justify-center py-16 md:py-24 px-4 sm:px-8">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-blue-light/50 to-transparent -z-10" />

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-start gap-6"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-dark leading-tight">
            Discover Superior <span className="text-brand-blue">Acrylic</span> Craftsmanship with Classic Concepts
          </h1>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mt-2">
            {pills.map((pill) => (
              <span 
                key={pill} 
                className="bg-brand-blue text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-full shadow-sm"
              >
                {pill}
              </span>
            ))}
          </div>

          <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-xl uppercase tracking-wider font-medium mt-4">
            Classic Concepts is a leading manufacturer of high-quality acrylic products in India. Discover our wide range of acrylic podiums, displays, interiors, and custom solutions.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <Link 
              href="/shop"
              className="border-2 border-brand-blue text-brand-blue font-bold px-8 py-3 rounded-full hover:bg-brand-blue hover:text-white transition-all shadow-sm"
            >
              View Products
            </Link>
            <Link 
              href="/podiums"
              className="border-2 border-brand-blue text-brand-blue font-bold px-8 py-3 rounded-full hover:bg-brand-blue hover:text-white transition-all shadow-sm"
            >
              Shop Podiums
            </Link>
          </div>
        </motion.div>

        {/* Right Image/Model */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative flex justify-center lg:justify-end"
        >
          {/* Using a placeholder visual that represents clear acrylic or podium */}
          <div className="relative w-full max-w-md aspect-square bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 flex flex-col items-center justify-center p-8 overflow-hidden group">
            {/* Watermark text */}
            <div className="absolute inset-0 flex items-center justify-center -rotate-45 opacity-5 pointer-events-none">
              <span className="text-6xl font-black whitespace-nowrap">classic concepts</span>
            </div>
            
            {/* Mock Podium Graphic using CSS */}
            <div className="w-48 h-80 relative flex flex-col items-center">
              {/* Podium Top */}
              <div className="w-full h-8 bg-blue-50/80 backdrop-blur-md border border-blue-100 rounded-lg shadow-sm z-20 group-hover:-translate-y-2 transition-transform duration-500" />
              {/* Podium Body */}
              <div className="w-3/4 h-64 bg-gradient-to-b from-blue-50/50 to-white backdrop-blur-xl border-x border-blue-100 -mt-2 z-10 flex items-center justify-center">
                <div className="w-2/3 h-1/2 border border-blue-200/50 rounded-lg opacity-50" />
              </div>
              {/* Podium Base */}
              <div className="w-full h-10 bg-blue-50/90 backdrop-blur-md border border-blue-100 rounded-full shadow-md z-20 -mt-4 group-hover:scale-105 transition-transform duration-500" />
            </div>
            
            <div className="absolute bottom-4 left-0 w-full text-center">
              <span className="font-bold text-brand-dark text-lg tracking-wider">MODEL: CCP055 [Clear]</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
