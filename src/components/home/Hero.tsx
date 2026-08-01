import Link from "next/link";
import { ShieldCheck, Target, Settings, MapPin } from "lucide-react";

export function Hero() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center pt-16 pb-16 overflow-hidden bg-[#02040a]">

      {/* Immersive Deep Background & Animated Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Background Image */}
        <div className="absolute inset-0 bg-[url('/hero.png')] bg-cover bg-center bg-no-repeat"></div>
        
        {/* Deep background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#05060A]/90 via-[#02040a]/60 to-[#0a0612]/95 mix-blend-multiply"></div>

        {/* Giant glowing orbs for 'stage lighting' effect */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[150px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#e31837] rounded-full mix-blend-screen filter blur-[150px] opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-[#8b5cf6] rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>

        {/* Subtle grid pattern overlay for a premium tech feel */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-20 flex flex-col items-center text-center">

        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[#3b82f6] text-[11px] font-bold uppercase tracking-[0.2em] mb-10 shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:bg-white/10 transition-colors cursor-default">
          <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse shadow-[0_0_8px_#3b82f6]"></span>
          Premium Manufacturer in India
        </div>

        {/* Massive Center Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-[5rem] font-extrabold text-white leading-[1.1] mb-8 tracking-tight max-w-5xl">
          Elevate Your Space with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#e31837]">
            Premium Acrylic
          </span> <br className="hidden md:block" />
          Craftsmanship
        </h1>

        <p className="text-base md:text-xl text-gray-300 mb-14 max-w-2xl leading-relaxed font-medium">
          We manufacture high-quality acrylic products that bring elegance, flawless durability, and functional brilliance to your spaces.
        </p>

        {/* Advanced Glassmorphism Badges Row */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-16 w-full max-w-5xl">
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e31837]/20 to-[#e31837]/5 flex items-center justify-center text-[#e31837] border border-[#e31837]/30 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[12px] font-extrabold text-white leading-tight uppercase tracking-widest">Premium</span>
              <span className="text-[11px] text-gray-400">Materials</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e31837]/20 to-[#e31837]/5 flex items-center justify-center text-[#e31837] border border-[#e31837]/30 group-hover:scale-110 transition-transform">
              <Target size={20} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[12px] font-extrabold text-white leading-tight uppercase tracking-widest">Precision</span>
              <span className="text-[11px] text-gray-400">Crafted</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e31837]/20 to-[#e31837]/5 flex items-center justify-center text-[#e31837] border border-[#e31837]/30 group-hover:scale-110 transition-transform">
              <Settings size={20} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[12px] font-extrabold text-white leading-tight uppercase tracking-widest">Custom</span>
              <span className="text-[11px] text-gray-400">Solutions</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e31837]/20 to-[#e31837]/5 flex items-center justify-center text-[#e31837] border border-[#e31837]/30 group-hover:scale-110 transition-transform">
              <MapPin size={20} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[12px] font-extrabold text-white leading-tight uppercase tracking-widest">Made In</span>
              <span className="text-[11px] text-gray-400">India</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Link
            href="/shop"
            className="px-10 py-4 rounded-full bg-gradient-to-r from-[#0047e1] to-[#3b82f6] text-white font-bold text-[14px] uppercase tracking-[0.15em] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:scale-105 transition-all duration-300"
          >
            Explore Collection &rarr;
          </Link>
          <Link
            href="/podiums"
            className="px-10 py-4 rounded-full bg-white/5 border border-white/20 text-white font-bold text-[14px] uppercase tracking-[0.15em] hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300"
          >
            Shop Podiums
          </Link>
        </div>

      </div>
    </section>
  );
}
