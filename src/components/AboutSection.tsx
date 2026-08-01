"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Award, ShieldCheck, CheckCircle, Globe } from "lucide-react";

export default function AboutSection() {
  const certifications = [
    { icon: <ShieldCheck size={32} />, name: "ISO 9001:2015" },
    { icon: <Award size={32} />, name: "ASCB(E) Certified" },
    { icon: <CheckCircle size={32} />, name: "HYM Certified" },
    { icon: <Globe size={32} />, name: "GA Global Accreditation" },
  ];

  return (
    <section className="w-full bg-white py-20 px-4 sm:px-8 border-b border-gray-100">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
        
        {/* Left side: Text Content */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex-1 flex flex-col items-start"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-brand-blue mb-6">About <span className="text-[#e31837]">C</span><span className="text-black">lassic</span> <span className="text-[#e31837]">C</span><span className="text-black">oncepts</span></h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-8">
            Classic Concepts boasts of having an ace team of highly qualified engineers who are dedicated to help our benevolent clients and customers regarding their queries and by providing them the solutions they have been looking for.
          </p>
          <Link 
            href="/about"
            className="bg-brand-blue text-white font-semibold px-8 py-4 rounded-lg hover:bg-blue-800 transition-colors shadow-md"
          >
            Discover More About Us
          </Link>
        </motion.div>

        {/* Right side: Certifications Grid */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex-1 w-full grid grid-cols-2 gap-6"
        >
          {certifications.map((cert, i) => (
            <div 
              key={i} 
              className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg hover:bg-white transition-all duration-300 gap-4 group"
            >
              <div className="text-brand-blue group-hover:scale-110 transition-transform duration-300">
                {cert.icon}
              </div>
              <span className="font-bold text-sm text-center text-brand-dark">{cert.name}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
