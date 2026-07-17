import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function AboutSnippet() {
  return (
    <section className="bg-white py-20 border-t border-slate-100">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-16 relative">
          
          {/* Subtle connecting line in background (desktop only) */}
          <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-px bg-slate-100 -z-10"></div>

          {/* Left Certifications */}
          <div className="flex flex-col gap-8 items-center w-full md:w-1/4">
             <div className="w-32 h-32 bg-white rounded-full shadow-soft border border-slate-50 flex items-center justify-center p-4 transform hover:-translate-y-2 transition-transform duration-300">
               <Image src="/iso-certificate.png" alt="ISO 9001:2015" width={100} height={100} unoptimized className="object-contain" />
             </div>
             <div className="w-32 h-32 bg-white rounded-full shadow-soft border border-slate-50 flex items-center justify-center p-4 transform hover:-translate-y-2 transition-transform duration-300">
               <Image src="/ascb-certificate.png" alt="ASCB(E)" width={100} height={100} unoptimized className="object-contain" />
             </div>
          </div>

          {/* Center Text */}
          <div className="flex flex-col items-center text-center w-full md:w-2/4 bg-white/80 backdrop-blur-sm p-10 rounded-3xl shadow-sm border border-slate-50">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6 tracking-tight">
              About <span className="text-[#0056b3]">Classic Concepts</span>
            </h2>
            <p className="text-slate-500 text-[15px] leading-loose mb-10 font-medium">
              Classic Concepts boasts of having an ace team of highly qualified engineers who are dedicated to help our benevolent clients and customers regarding their queries and by providing them the solutions, they have been looking for.
            </p>
            <Link
              href="/about"
              className="group flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-[#0056b3] hover:border-[#0056b3] hover:text-white transition-all duration-300 shadow-sm"
            >
              Read Full Story
              <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Right Certifications */}
          <div className="flex flex-col gap-8 items-center w-full md:w-1/4">
             <div className="w-32 h-32 bg-white rounded-full shadow-soft border border-slate-50 flex items-center justify-center p-4 transform hover:-translate-y-2 transition-transform duration-300">
               <Image src="/hym-certificate.png" alt="HYM" width={100} height={100} unoptimized className="object-contain" />
             </div>
             <div className="w-32 h-32 bg-white rounded-full shadow-soft border border-slate-50 flex items-center justify-center p-4 transform hover:-translate-y-2 transition-transform duration-300">
               <Image src="/ga-certificate.png" alt="Global Accreditation" width={100} height={100} unoptimized className="object-contain" />
             </div>
          </div>

        </div>
      </div>
    </section>
  );
}
