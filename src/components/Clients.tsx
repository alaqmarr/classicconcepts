"use client";

import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import Image from "next/image";

type ClientType = { id: string; name: string; logoUrl: string | null };
type PlatformType = { id: string; name: string; storeUrl: string; storeRegion: string; iconName: string; colorClass: string | null };

export default function Clients({ clients, platforms }: { clients: ClientType[], platforms: PlatformType[] }) {
  return (
    <section className="w-full bg-white py-20 px-4 sm:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col gap-16">
        
        {/* Clients Section */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#0056b3] mb-10 text-center sm:text-left">Our Clients</h2>
          
          <div className="w-full relative">
            <div className="flex overflow-x-auto pb-4 hide-scrollbar gap-8 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {clients.map((client) => (
                <div 
                  key={client.id} 
                  className="min-w-[140px] h-24 bg-white border border-slate-100 shadow-sm rounded-xl flex items-center justify-center p-4 text-slate-400 font-bold hover:grayscale-0 grayscale hover:shadow-md transition-all shrink-0"
                >
                  {client.logoUrl ? (
                    <div className="relative w-full h-full">
                      <Image src={client.logoUrl} alt={client.name} fill className="object-contain" />
                    </div>
                  ) : (
                    <span className="text-xl text-center leading-none text-slate-600">{client.name}</span>
                  )}
                </div>
              ))}
              {clients.length === 0 && (
                <div className="text-slate-500 italic">No clients added yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* E-commerce platforms */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-4xl mx-auto border border-slate-200 rounded-3xl p-8 md:p-12 relative mt-8 shadow-soft bg-slate-50/50"
        >
          {/* Tag */}
          <div className="absolute -top-4 left-8 bg-white px-4 py-1 flex items-center gap-2 border border-slate-200 rounded-full text-[#0056b3] font-bold text-sm shadow-sm">
            <ShoppingCart size={16} />
            Happy News
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-12 justify-center">
            <h3 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">We are available on</h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4 justify-center">
                {platforms.map((p) => (
                  <a key={p.id} href={p.storeUrl} target="_blank" rel="noreferrer" className="flex border-2 border-[#0056b3] rounded-lg overflow-hidden bg-white shadow-sm hover:scale-105 transition-transform cursor-pointer">
                    <div className={`px-6 py-2 font-black text-xl border-r-2 border-[#0056b3] ${p.colorClass || 'text-slate-800'}`}>{p.name}</div>
                    <div className="bg-[#0056b3] text-white px-4 py-3 text-xs font-bold flex items-center">Visit Our {p.storeRegion}</div>
                  </a>
                ))}
                {platforms.length === 0 && (
                   <div className="text-slate-500 italic">No platforms added yet.</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
