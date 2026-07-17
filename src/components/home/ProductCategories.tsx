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
    <section className="py-24 bg-slate-50 border-t border-slate-100">
      <div className="container mx-auto px-4 md:px-8">
        
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-3">Explore Categories</h2>
            <p className="text-slate-500 font-medium max-w-xl">Browse our extensive collection of premium acrylic products designed for durability and elegance.</p>
          </div>
          <Link href="/shop" className="hidden md:flex items-center gap-2 text-[#0056b3] font-bold hover:text-blue-800 transition-colors group">
            View All
            <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {categories.map((category) => {
            return (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-hover hover:-translate-y-2 transition-all duration-300 border border-slate-100"
              >
                {/* Image Section */}
                <div className="relative w-full h-56 bg-slate-100 p-4 overflow-hidden">
                  <div className="absolute inset-0 bg-slate-200/50 group-hover:bg-transparent transition-colors z-10"></div>
                  <Image
                    src={category.imageUrl || `https://via.placeholder.com/400x400?text=${encodeURIComponent(category.name)}`}
                    alt={category.name}
                    fill
                    className="object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out"
                    unoptimized
                  />
                </div>
                
                {/* Title Bar */}
                <div className="bg-white py-5 px-6 flex justify-between items-center relative z-20 border-t border-slate-50">
                  <h3 className="text-[15px] font-extrabold text-slate-700 group-hover:text-[#0056b3] transition-colors">{category.name}</h3>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0056b3] group-hover:text-white transition-colors">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        
        <div className="mt-10 md:hidden flex justify-center">
          <Link href="/shop" className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold shadow-sm">
            View All Categories
          </Link>
        </div>
      </div>
    </section>
  );
}
