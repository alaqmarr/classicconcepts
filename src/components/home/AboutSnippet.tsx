import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function AboutSnippet() {
  return (
    <section className="relative z-20 px-4 md:px-8 py-16 bg-gradient-to-br from-[#fff0f0] via-[#fffbf0] to-[#f0f4ff]">
      <div className="container mx-auto max-w-6xl bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100 p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          
          {/* Left Certifications (ISO) */}
          <div className="flex flex-row md:flex-col gap-6 items-center md:w-[15%] justify-center">
             <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-3">
               <Image src="/iso-certificate.png" alt="ISO 9001:2015" width={80} height={80} unoptimized className="object-contain" />
             </div>
             <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-3">
               <Image src="/ascb-certificate.png" alt="ASCB(E)" width={80} height={80} unoptimized className="object-contain" />
             </div>
          </div>

          {/* Center Text */}
          <div className="flex flex-col items-start md:items-center md:text-center w-full md:w-[70%]">
            <span className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest mb-3">Who We Are</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6 tracking-tight">
              About <span className="text-[#e31837]">C</span><span className="text-black">lassic</span> <span className="text-[#e31837]">C</span><span className="text-black">oncepts</span>
            </h2>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-8 font-medium max-w-3xl">
              Classic Concepts boasts of having an ace team of highly qualified engineers who are dedicated to help our benevolent clients and customers regarding their queries and by providing them the solutions, they have been looking for. Our commitment to quality, innovation and customer satisfaction has made us a trusted name in acrylic manufacturing.
            </p>
            <Link
              href="/about"
              className="group inline-flex items-center gap-2 bg-white border border-[#3b82f6] text-[#3b82f6] px-8 py-3 rounded-full font-bold text-sm hover:bg-[#3b82f6] hover:text-white transition-all duration-300 shadow-sm"
            >
              Read Full Story
              <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Right Certifications (HYM, QA Global) */}
          <div className="flex flex-row md:flex-col gap-6 items-center md:w-[15%] justify-center">
             <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-3">
               <Image src="/hym-certificate.png" alt="HYM" width={80} height={80} unoptimized className="object-contain" />
             </div>
             <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-3">
               <Image src="/ga-certificate.png" alt="Global Accreditation" width={80} height={80} unoptimized className="object-contain" />
             </div>
          </div>

        </div>
      </div>
    </section>
  );
}
