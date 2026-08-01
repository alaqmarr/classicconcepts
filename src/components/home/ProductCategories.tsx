import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { ArrowRight } from "lucide-react";

export async function ProductCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: 'asc' }
  });

  if (!categories || categories.length === 0) return null;

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white">
      {/* Subtle Radial Gradient Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(227,24,55,0.04)_0%,rgba(255,223,0,0.03)_40%,rgba(59,130,246,0.03)_70%,transparent_100%)] pointer-events-none"></div>
      
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <span className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest mb-2 block">Our Products</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
              Explore Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-red-500">Categories</span>
            </h2>
          </div>
          <Link href="/shop" className="inline-flex items-center gap-2 text-[#3b82f6] font-bold text-sm hover:text-blue-800 transition-colors group">
            View All Products
            <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 md:gap-8">
          {categories.map((category) => {
            return (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group flex flex-col bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
              >
                {/* Image Section */}
                <div className="relative w-full h-64 bg-slate-100 overflow-hidden">
                  <Image
                    src={category.imageUrl || "/placeholder-image.jpg"}
                    alt={category.name}
                    fill
                    className="object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
                    unoptimized
                  />
                  {/* Subtle inner shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                {/* Title Bar */}
                <div className="bg-[#f8f9fa] py-5 px-6 flex justify-between items-center group-hover:bg-blue-50 transition-colors duration-300">
                  <h3 className="text-[15px] font-bold text-slate-800 group-hover:text-[#0056b3] transition-colors">{category.name}</h3>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-red-500 group-hover:bg-[#3b82f6] group-hover:text-white shadow-sm transition-all duration-300">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        
      </div>
    </section>
  );
}
