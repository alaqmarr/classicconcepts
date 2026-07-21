import Image from "next/image";
import { Play } from "lucide-react";
import { prisma } from "@/lib/db";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

export async function HowWeDoIt() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });
  
  return (
    <section className="bg-gradient-to-b from-[#f0f4ff] via-[#fffbf0] to-[#fff0f0] py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          
          <div className="w-full md:w-1/2">
            <span className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest mb-3 block">How We Do It?</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight mb-8">
              Manufacturing<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-[#e31837]">Process</span>
            </h2>
            
            <div className="text-slate-600 space-y-6 text-sm md:text-base leading-relaxed font-medium mb-10">
              <p>
                At Classic Concepts, we utilize innovative technologies and employ a highly qualified team of engineers to design podiums and other acrylic products.
              </p>
              <p>
                Our Acrylic products are crafted with the utmost attention to detail, ensuring they are durable and easy to handle. We also pride ourselves on our competitive pricing and elegant finish, providing exceptional value to our customers.
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm shrink-0">
                 <Play size={20} className="ml-1" />
               </div>
               <p className="text-slate-700 text-sm font-bold leading-snug">
                 We specialize in manufacturing of Laser cut design components & sheet metal parts for different types of applications.
               </p>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 flex justify-center relative">
            {settings?.homeVideoUrl ? (
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl">
                <iframe 
                  src={getYouTubeEmbedUrl(settings.homeVideoUrl) || ''} 
                  title="How We Do It Video" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                ></iframe>
              </div>
            ) : (
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl group cursor-pointer border border-slate-100">
                <Image
                  src="/placeholder-image.jpg"
                  alt="How We Do It Video"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/20 transition-colors"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#e31837] shadow-xl group-hover:scale-110 group-hover:bg-[#e31837] group-hover:text-white transition-all duration-300">
                      <Play size={32} className="ml-2" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Decorative background shape */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none z-[-1]"></div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
