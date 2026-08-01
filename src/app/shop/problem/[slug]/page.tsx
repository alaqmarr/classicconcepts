import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductCard } from "@/components/shop/ProductCard";
import Link from "next/link";
import { Filter, Search } from "lucide-react";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const problemStatements = await prisma.problemStatement.findMany({
    select: { slug: true }
  });
  
  return problemStatements.map((problemStatement: any) => ({
    slug: problemStatement.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const problemStatement = await prisma.problemStatement.findUnique({
    where: { slug }
  });

  if (!problemStatement) return { title: "ProblemStatement Not Found - Classic Concepts" };

  const title = `${problemStatement.name} - Shop at Classic Concepts`;
  const description = `Browse our collection of premium acrylic ${problemStatement.name.toLowerCase()}.`;
  const mainImage = problemStatement.imageUrl || "/short-logo.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://classicconcepts.in/shop/problem/${problemStatement.slug}`,
      siteName: "Classic Concepts",
      images: [
        {
          url: mainImage,
          width: 800,
          height: 800,
          alt: problemStatement.name,
        }
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [mainImage],
    }
  };
}

export default async function ProblemStatementShopPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { slug } = await params;
  const awaitedSearchParams = await searchParams;
  const searchQuery = typeof awaitedSearchParams.q === 'string' ? awaitedSearchParams.q : undefined;

  const problemStatement = await prisma.problemStatement.findUnique({
    where: { slug }
  });

  if (!problemStatement) {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: {
      problemStatements: { some: { id: problemStatement.id } },
      ...(searchQuery ? { name: { contains: searchQuery } } : {})
    },
    include: {
      images: { orderBy: { createdAt: 'asc' } },
      category: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const allProblemStatements = await prisma.problemStatement.findMany({
    orderBy: { name: 'asc' }
  });

  const totalProductsOverall = await prisma.product.count();
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "ProblemStatements", href: "/shop/c" },
          { label: problemStatement.name }
        ]}
        title={
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {problemStatement.name}
          </span>
        }
      />

      <section className="py-12 container mx-auto px-6 relative z-20 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Filter size={18} className="text-[#0056b3]" />
              ProblemStatements
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/shop" className="text-slate-600 hover:text-[#0056b3] font-medium text-sm flex items-center justify-between group transition-colors">
                  <span>All Products</span>
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs group-hover:bg-blue-50 group-hover:text-[#0056b3] transition-colors">
                    {totalProductsOverall}
                  </span>
                </Link>
              </li>
              {allProblemStatements.map(cat => {
                const isActive = cat.id === problemStatement.id;
                return (
                  <li key={cat.id}>
                    <Link href={`/shop/problem/${cat.slug}`} className={`${isActive ? "text-[#0056b3] font-bold" : "text-slate-600 hover:text-[#0056b3] font-medium"} text-sm flex items-center justify-between transition-colors`}>
                      <span>{cat.name}</span>
                      {isActive && (
                        <span className="bg-blue-50 text-[#0056b3] px-2 py-0.5 rounded-full text-xs">
                          {products.length}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          
          {/* Top Bar (Search) */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-sm font-medium">
              Showing <span className="font-bold text-slate-900">{products.length}</span> products in {problemStatement.name}
            </p>
            
            <form className="relative w-full sm:w-72" method="GET" action={`/shop/problem/${problemStatement.slug}`}>
              <input 
                type="text" 
                name="q"
                defaultValue={searchQuery}
                placeholder={`Search in ${problemStatement.name}...`} 
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
              <h3 className="text-xl font-bold text-slate-800 mb-2">No products found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                We couldn't find any products in this problemStatement matching your criteria.
              </p>
              {searchQuery && (
                <Link href={`/shop/problem/${problemStatement.slug}`} className="inline-block mt-6 bg-[#0056b3] text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-800 transition-colors">
                  Clear Search
                </Link>
              )}
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
