import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductCard } from "@/components/shop/ProductCard";
import Link from "next/link";
import { Search } from "lucide-react";

export const metadata = {
  title: "Podiums - Classic Concepts",
  description: "Browse our premium collection of acrylic podiums.",
};

export default async function PodiumsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const searchQuery = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined;

  const products = await prisma.product.findMany({
    where: {
      isPodium: true,
      ...(searchQuery ? { name: { contains: searchQuery } } : {})
    },
    include: {
      images: { orderBy: { createdAt: 'asc' } },
      category: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col relative">
      {/* Subtle Radial Gradient Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(227,24,55,0.03)_0%,rgba(255,223,0,0.02)_40%,rgba(59,130,246,0.02)_80%,transparent_100%)] pointer-events-none"></div>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Podiums" }
        ]}
        title={
          <>
            Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Podiums</span>
          </>
        }
      />

      <section className="py-12 container mx-auto px-6 relative z-20">
        
        {/* Main Content */}
        <div className="space-y-6">
          
          {/* Top Bar (Search) */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-sm font-medium">
              Showing <span className="font-bold text-slate-900">{products.length}</span> podiums
            </p>
            
            <form className="relative w-full sm:w-72" method="GET" action="/podiums">
              <input 
                type="text" 
                name="q"
                defaultValue={searchQuery}
                placeholder="Search podiums..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition-all"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0056b3]">
                <Search size={18} />
              </button>
            </form>
          </div>

          {/* Product Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} phone={settings?.phone1} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No podiums found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                We couldn't find any podiums matching your criteria.
              </p>
              <Link href="/podiums" className="inline-block mt-6 bg-[#0056b3] text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-800 transition-colors">
                Clear Search
              </Link>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
