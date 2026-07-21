import Image from "next/image";
import { prisma } from "@/lib/db";

export async function Clients() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });

  if (!clients || clients.length === 0) return null;

  return (
    <section className="relative bg-[#f8fafc] py-20 overflow-hidden">
      {/* Animated Glowing Orbs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[300px] h-[300px] bg-red-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
        <div className="absolute top-[30%] right-[20%] w-[350px] h-[350px] bg-yellow-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[40%] w-[400px] h-[400px] bg-blue-400 rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 mb-12 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-2 drop-shadow-sm">
          Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-600">1000+ Brands</span> Worldwide
        </h2>
      </div>

      {/* Infinite Marquee in a Glassmorphism Container */}
      <div className="relative w-full max-w-[100vw] overflow-hidden flex backdrop-blur-md py-6 border-y border-none z-10">
        {/* Gradients for smooth fade in/out on edges (matching glassmorphism) */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#f8fafc] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#f8fafc] to-transparent z-10 pointer-events-none"></div>

        <div className="flex animate-marquee w-max items-center">
          {/* Double the list for infinite effect */}
          {[...clients, ...clients].map((client, idx) => (
            <div key={`${client.id}-${idx}`} className="flex-shrink-0 flex items-center justify-center w-40 h-16 md:w-48 md:h-20 mx-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              {client.logoUrl ? (
                <div className="relative w-full h-full">
                  <Image src={client.logoUrl} alt={client.name} fill className="object-contain" unoptimized />
                </div>
              ) : (
                <span className="font-bold text-slate-400 text-lg tracking-wide">{client.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
