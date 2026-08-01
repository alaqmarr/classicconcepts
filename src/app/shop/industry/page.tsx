import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { IndustryCard } from "@/components/shop/IndustryCard";
import { FolderTree } from "lucide-react";

export const metadata = {
  title: "Shop Industries - Classic Concepts",
  description: "Browse our premium acrylic furniture and products by industry.",
};

export default async function ShopIndustriesPage() {
  const industries = await prisma.industry.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { products: true }
      }
    }
  });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Industries" }
        ]}
        title={
          <>
            Shop by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Industry</span>
          </>
        }
      />

      <section className="py-20 container mx-auto px-6 relative z-20">
        <div className="flex items-center gap-3 mb-10 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0056b3]">
            <FolderTree size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">All Industries</h2>
            <p className="text-slate-500 text-sm font-medium">Browse our extensive catalog structured for your convenience</p>
          </div>
        </div>

        {industries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {industries.map(industry => (
              <div key={industry.id} className="relative group">
                <IndustryCard industry={industry} />
                <div className="absolute top-4 right-4 z-30 bg-white/90 backdrop-blur text-[#0056b3] text-xs font-bold px-3 py-1 rounded-full shadow-sm pointer-events-none">
                  {industry._count.products} Items
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">No industries found</h3>
            <p className="text-slate-500">Industries will appear here once they are added in the admin dashboard.</p>
          </div>
        )}
      </section>
    </main>
  );
}
