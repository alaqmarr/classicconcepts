import Image from "next/image";
import { Handshake } from "lucide-react";
import { prisma } from "@/lib/db";
import * as FaIcons from "react-icons/fa";
import * as SiIcons from "react-icons/si";

export async function Clients() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  const platforms = await prisma.onlinePlatform.findMany({ orderBy: { createdAt: 'asc' } });

  // Helper to dynamically render icons
  const renderIcon = (iconName: string, size: number) => {
    const FaIcon = (FaIcons as any)[iconName];
    if (FaIcon) return <FaIcon size={size} />;
    
    const SiIcon = (SiIcons as any)[iconName];
    if (SiIcon) return <SiIcon size={size} />;
    
    return null; // Fallback
  };

  return (
    <section className="bg-[#fafbfc] py-20 overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 mb-16 text-center">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Our Trusted Clients</h2>
        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-red-500 mx-auto rounded-full mb-12"></div>
      </div>
      
      {/* Infinite Marquee */}
      <div className="relative w-full max-w-[100vw] overflow-hidden flex border-y border-gray-100 bg-white py-12 mb-24">
        {/* Gradients for smooth fade in/out on edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

        <div className="flex animate-marquee w-max">
          {/* Double the list for infinite effect */}
          {[...clients, ...clients].map((client, idx) => (
            <div key={`${client.id}-${idx}`} className="flex-shrink-0 flex items-center justify-center w-48 h-20 mx-6 bg-white border border-slate-100 rounded-xl shadow-soft hover:shadow-hover transition-all duration-300 transform hover:-translate-y-1 overflow-hidden p-2">
              {client.logoUrl ? (
                <div className="relative w-full h-full">
                  <Image src={client.logoUrl} alt={client.name} fill className="object-contain" />
                </div>
              ) : (
                <span className="font-bold text-slate-600 text-lg tracking-wide">{client.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8">
        {/* Happy News Section - Modern Glass Card */}
        <div className="relative glass-card rounded-2xl p-8 md:p-14 shadow-soft">
          
          <div className="absolute -top-5 left-10 bg-white px-6 py-2 rounded-full flex items-center gap-2 text-[#0056b3] font-bold shadow-md border border-gray-100">
            <Handshake size={20} className="text-red-500" />
            <span className="tracking-wide">Happy News</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 mt-6">
            <div className="w-full md:w-1/3 text-center md:text-left">
              <h3 className="text-4xl font-extrabold text-slate-800 leading-tight mb-4">
                We are now <br/><span className="text-[#0056b3]">available on</span>
              </h3>
              <p className="text-slate-500 text-sm">Shop our premium acrylic products directly from your favorite platforms.</p>
            </div>
            
            <div className="w-full md:w-2/3 flex flex-wrap justify-center gap-6">
              {platforms.map((platform) => (
                <a 
                  key={platform.id}
                  href={platform.storeUrl} 
                  className="flex w-64 bg-white rounded-xl overflow-hidden shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 border border-slate-100 group"
                >
                  <div className={`w-1/2 flex items-center justify-center p-4 ${platform.colorClass || 'text-slate-800'} bg-slate-50 group-hover:bg-white transition-colors`}>
                    {renderIcon(platform.iconName, 40) || <span className="font-bold text-xl">{platform.name}</span>}
                  </div>
                  <div className="w-1/2 bg-gradient-to-r from-[#0056b3] to-blue-700 text-white flex flex-col justify-center px-4 py-3 relative overflow-hidden">
                    <span className="text-[10px] font-medium text-blue-200 uppercase tracking-wider mb-1">Available at</span>
                    <span className="text-sm font-bold leading-tight">{platform.storeRegion}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
