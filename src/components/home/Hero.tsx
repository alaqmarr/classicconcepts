import Link from "next/link";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative bg-white pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden border-b border-slate-100">
      {/* Soft Glow Backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-50 rounded-full blur-3xl opacity-60 translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>
      
      <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-16 relative z-10">
        
        {/* Left Side Content */}
        <div className="w-full md:w-[55%] flex flex-col items-start text-left">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#0056b3] text-xs font-bold uppercase tracking-widest mb-6 border border-blue-100">
            <span className="w-2 h-2 rounded-full bg-[#0056b3] animate-pulse"></span>
            Premium Manufacturer in India
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-slate-800 leading-[1.15] mb-8 tracking-tight">
            Discover Superior <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0056b3] to-blue-500">Acrylic Craftsmanship</span> <br/>
            with Classic Concepts
          </h1>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-3 mb-8">
            <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-5 py-2 rounded-lg uppercase tracking-wider shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-default">Acrylic Podiums</span>
            <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-5 py-2 rounded-lg uppercase tracking-wider shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-default">Acrylic Interiors</span>
            <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-5 py-2 rounded-lg uppercase tracking-wider shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-default">Acrylic Lighting</span>
            <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-5 py-2 rounded-lg uppercase tracking-wider shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-default">Acrylic Furniture</span>
          </div>

          <p className="text-base text-slate-500 mb-10 max-w-xl leading-relaxed font-medium">
            We specialize in manufacturing high-quality acrylic products that elevate your spaces. Explore our exclusive range of podiums, sophisticated displays, elegant interiors, and bespoke custom solutions.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/shop"
              className="px-8 py-3.5 rounded-xl bg-[#0056b3] text-white font-bold text-sm hover:bg-blue-800 hover:shadow-hover transition-all duration-300 transform hover:-translate-y-0.5 tracking-wide"
            >
              Explore Products
            </Link>
            <Link
              href="/podiums"
              className="px-8 py-3.5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm hover:border-[#0056b3] hover:text-[#0056b3] transition-all duration-300 transform hover:-translate-y-0.5 tracking-wide"
            >
              Shop Podiums
            </Link>
          </div>
        </div>

        {/* Right Side Image */}
        <div className="w-full md:w-[45%] flex justify-center md:justify-end">
          <div className="relative w-full max-w-lg aspect-square">
             {/* Decorative Elements around image */}
             <div className="absolute inset-4 rounded-3xl bg-gradient-to-br from-blue-50 to-slate-50 shadow-soft transform rotate-3 scale-105"></div>
             <div className="absolute inset-4 rounded-3xl bg-white shadow-sm border border-slate-100 flex items-center justify-center p-8 z-10">
               <div className="relative w-full h-full">
                 <Image 
                    src="/hero-podium.png" 
                    alt="Premium Acrylic Podium" 
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                 />
               </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
